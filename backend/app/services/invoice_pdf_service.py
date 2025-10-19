# backend/app/services/invoice_pdf_service.py
"""
Invoice PDF Generation Service
Generates professional PDF invoices using ReportLab
"""
import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from io import BytesIO

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab not available - PDF generation will fail")


class InvoicePDFService:
    """Service for generating invoice PDFs"""

    def __init__(self):
        # Create temp directory for PDFs if it doesn't exist
        self.pdf_dir = Path("temp_pdfs")
        self.pdf_dir.mkdir(exist_ok=True)

        self.organization_name = os.getenv('ORGANIZATION_NAME', 'NDIS Service Provider')
        self.organization_phone = os.getenv('ORGANIZATION_PHONE', '1300 XXX XXX')
        self.organization_email = os.getenv('ORGANIZATION_EMAIL', 'info@yourprovider.com.au')
        self.organization_address = os.getenv('ORGANIZATION_ADDRESS', '123 Service Street, City, State')
        self.organization_website = os.getenv('ORGANIZATION_WEBSITE', 'www.yourprovider.com.au')

    def generate_invoice_pdf(self, invoice, participant) -> Optional[str]:
        """
        Generate PDF for an invoice

        Args:
            invoice: Invoice model object
            participant: Participant model object

        Returns:
            Path to generated PDF file, or None if generation failed
        """
        if not REPORTLAB_AVAILABLE:
            logger.error("Cannot generate PDF - ReportLab not available")
            return None

        try:
            # Generate filename
            filename = f"Invoice_{invoice.invoice_number.replace('/', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            filepath = self.pdf_dir / filename

            # Create PDF document
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=0.75*inch,
                leftMargin=0.75*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )

            # Build the PDF content
            elements = []
            styles = getSampleStyleSheet()

            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=26,
                textColor=colors.HexColor('#047857'),
                spaceAfter=8,
                alignment=1,  # Center
                fontName='Helvetica-Bold'
            )

            subtitle_style = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=colors.HexColor('#6b7280'),
                spaceAfter=20,
                alignment=1  # Center
            )

            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=13,
                textColor=colors.HexColor('#047857'),
                spaceAfter=10,
                fontName='Helvetica-Bold'
            )

            label_style = ParagraphStyle(
                'LabelStyle',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                spaceAfter=2
            )

            value_style = ParagraphStyle(
                'ValueStyle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#1f2937'),
                fontName='Helvetica-Bold'
            )

            # Header - Organization Name and Invoice Title
            elements.append(Paragraph(self.organization_name, title_style))
            elements.append(Paragraph("TAX INVOICE", subtitle_style))

            # Organization Details (centered, smaller)
            org_details_style = ParagraphStyle(
                'OrgDetails',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                alignment=1,
                spaceAfter=15
            )
            elements.append(Paragraph(f"{self.organization_address} | {self.organization_phone} | {self.organization_email}", org_details_style))

            # Horizontal line
            from reportlab.platypus import HRFlowable
            elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#047857'), spaceAfter=20))

            # Invoice Number (large and prominent)
            invoice_num_style = ParagraphStyle(
                'InvoiceNumber',
                parent=styles['Normal'],
                fontSize=20,
                textColor=colors.HexColor('#047857'),
                fontName='Helvetica-Bold',
                spaceAfter=5,
                alignment=0
            )
            elements.append(Paragraph(f"Invoice #{invoice.invoice_number}", invoice_num_style))
            elements.append(Spacer(1, 0.2*inch))

            # Bill To and Invoice Details Table
            participant_address = ""
            if hasattr(participant, 'address_line1') and participant.address_line1:
                participant_address = participant.address_line1
                if hasattr(participant, 'address_line2') and participant.address_line2:
                    participant_address += f", {participant.address_line2}"
                if hasattr(participant, 'suburb') and participant.suburb:
                    participant_address += f"<br/>{participant.suburb}"
                if hasattr(participant, 'state') and participant.state:
                    participant_address += f", {participant.state}"
                if hasattr(participant, 'postcode') and participant.postcode:
                    participant_address += f" {participant.postcode}"

            # Bill To and Invoice Details - Modern Layout
            bill_to_data = [
                [Paragraph("BILL TO", heading_style), Paragraph("INVOICE DETAILS", heading_style)],
                [
                    Paragraph(
                        f"<b><font size=11 color='#1f2937'>{participant.full_name}</font></b><br/>" +
                        f"<font size=9 color='#6b7280'>{participant_address}</font>" +
                        (f"<br/><font size=9 color='#6b7280'>NDIS: {participant.ndis_number}</font>" if participant.ndis_number else "") +
                        (f"<br/><font size=9 color='#6b7280'>{participant.email_address}</font>" if participant.email_address else ""),
                        styles['Normal']
                    ),
                    Paragraph(
                        f"<font size=9 color='#6b7280'><b>Issue Date:</b></font> <font size=9 color='#1f2937'>{invoice.issue_date.strftime('%d %B %Y')}</font><br/>" +
                        f"<font size=9 color='#6b7280'><b>Due Date:</b></font> <font size=10 color='#dc2626'><b>{invoice.due_date.strftime('%d %B %Y') if invoice.due_date else 'Upon receipt'}</b></font><br/>" +
                        f"<font size=9 color='#6b7280'><b>Billing Period:</b></font> <font size=9 color='#1f2937'>{invoice.billing_period_start.strftime('%d %b %Y')} - {invoice.billing_period_end.strftime('%d %b %Y')}</font><br/>" +
                        f"<font size=9 color='#6b7280'><b>Payment Method:</b></font> <font size=9 color='#1f2937'>{invoice.payment_method.value.replace('_', ' ').title()}</font>",
                        styles['Normal']
                    )
                ]
            ]

            bill_to_table = Table(bill_to_data, colWidths=[3.5*inch, 3.5*inch])
            bill_to_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#f0fdf4')),
                ('TOPPADDING', (0, 0), (1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (1, 0), 8),
                ('TOPPADDING', (0, 1), (1, 1), 12),
            ]))
            elements.append(bill_to_table)
            elements.append(Spacer(1, 0.35*inch))

            # Line Items Table
            items_data = [['Date', 'Service Type', 'Time', 'Hours', 'Rate', 'Amount']]
            for item in invoice.items:
                items_data.append([
                    item.date.strftime('%d/%m/%Y'),
                    item.service_type,
                    f"{item.start_time}-{item.end_time}",
                    f"{float(item.hours):.2f}",
                    f"${float(item.hourly_rate):,.2f}",
                    f"${float(item.total_amount):,.2f}"
                ])

            # Add section header for line items
            elements.append(Paragraph("SERVICES PROVIDED", heading_style))
            elements.append(Spacer(1, 0.1*inch))

            items_table = Table(items_data, colWidths=[0.95*inch, 1.85*inch, 1.1*inch, 0.75*inch, 0.95*inch, 1.2*inch])
            items_table.setStyle(TableStyle([
                # Header row styling
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#047857')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('TOPPADDING', (0, 0), (-1, 0), 10),

                # Data rows styling
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                ('ALIGN', (0, 1), (2, -1), 'LEFT'),
                ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),

                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),

                # Grid lines
                ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#047857')),
                ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor('#e5e7eb')),
                ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#d1d5db')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 0.35*inch))

            # Totals Table - Modern Design
            totals_data = [
                ['<font size=10 color="#6b7280">Subtotal:</font>', f'<font size=10 color="#1f2937">${float(invoice.subtotal):,.2f}</font>'],
                ['<font size=10 color="#6b7280">GST (10%):</font>', f'<font size=10 color="#1f2937">${float(invoice.gst_amount):,.2f}</font>'],
                ['<font size=13 color="#047857"><b>TOTAL AMOUNT:</b></font>', f'<font size=16 color="#047857"><b>${float(invoice.total_amount):,.2f}</b></font>']
            ]

            if float(invoice.amount_paid) > 0:
                totals_data.append(['<font size=10 color="#6b7280">Amount Paid:</font>', f'<font size=10 color="#16a34a">${float(invoice.amount_paid):,.2f}</font>'])
                totals_data.append(['<font size=12 color="#dc2626"><b>Amount Outstanding:</b></font>', f'<font size=14 color="#dc2626"><b>${float(invoice.amount_outstanding):,.2f}</b></font>'])

            totals_table_data = [[Paragraph(row[0], styles['Normal']), Paragraph(row[1], styles['Normal'])] for row in totals_data]
            totals_table = Table(totals_table_data, colWidths=[4.8*inch, 2.2*inch])
            totals_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, 1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 1), 8),
                ('TOPPADDING', (0, 2), (-1, 2), 14),
                ('BOTTOMPADDING', (0, 2), (-1, 2), 10),
                ('LINEABOVE', (0, 2), (-1, 2), 2, colors.HexColor('#047857')),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#f0fdf4')),
                ('LEFTPADDING', (0, 2), (-1, 2), 10),
                ('RIGHTPADDING', (0, 2), (-1, 2), 10),
            ]))
            elements.append(totals_table)
            elements.append(Spacer(1, 0.4*inch))

            # Payment Instructions Box
            payment_instructions_style = ParagraphStyle(
                'PaymentInstructions',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#1f2937'),
                leading=14
            )

            payment_header_style = ParagraphStyle(
                'PaymentHeader',
                parent=styles['Normal'],
                fontSize=11,
                textColor=colors.HexColor('#047857'),
                fontName='Helvetica-Bold',
                spaceAfter=8
            )

            elements.append(Paragraph("PAYMENT INSTRUCTIONS", payment_header_style))

            payment_text = (
                f"Please ensure payment is received by the due date shown above. "
                f"Quote invoice number <b>{invoice.invoice_number}</b> as your payment reference."
            )
            elements.append(Paragraph(payment_text, payment_instructions_style))
            elements.append(Spacer(1, 0.15*inch))

            # Contact info
            contact_style = ParagraphStyle(
                'ContactStyle',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.HexColor('#6b7280'),
                leading=12
            )
            elements.append(Paragraph(
                f"<b>Questions?</b> Contact us at {self.organization_email} or {self.organization_phone}",
                contact_style
            ))

            # Notes section if present
            if invoice.notes:
                elements.append(Spacer(1, 0.2*inch))
                notes_header_style = ParagraphStyle(
                    'NotesHeader',
                    parent=styles['Normal'],
                    fontSize=10,
                    textColor=colors.HexColor('#6b7280'),
                    fontName='Helvetica-Bold',
                    spaceAfter=6
                )
                notes_style = ParagraphStyle(
                    'NotesStyle',
                    parent=styles['Normal'],
                    fontSize=9,
                    textColor=colors.HexColor('#374151'),
                    leading=13
                )
                elements.append(Paragraph("NOTES", notes_header_style))
                elements.append(Paragraph(invoice.notes, notes_style))

            elements.append(Spacer(1, 0.3*inch))

            # Thank you message
            thank_you_style = ParagraphStyle(
                'ThankYou',
                parent=styles['Normal'],
                fontSize=11,
                textColor=colors.HexColor('#047857'),
                alignment=1,  # Center
                fontName='Helvetica-Oblique'
            )
            elements.append(Paragraph("Thank you for choosing our services!", thank_you_style))

            # Build PDF
            doc.build(elements)

            logger.info(f"Successfully generated PDF: {filepath}")
            return str(filepath)

        except Exception as e:
            logger.error(f"Error generating invoice PDF: {str(e)}", exc_info=True)
            return None

    def _generate_invoice_html(self, invoice, participant) -> str:
        """Generate HTML content for invoice"""

        # Format dates
        issue_date = invoice.issue_date.strftime('%d %B %Y')
        due_date = invoice.due_date.strftime('%d %B %Y') if invoice.due_date else "Upon receipt"
        billing_period = f"{invoice.billing_period_start.strftime('%d %B %Y')} - {invoice.billing_period_end.strftime('%d %B %Y')}"

        # Build line items HTML
        items_html = ""
        for item in invoice.items:
            items_html += f"""
            <tr>
                <td>{item.date.strftime('%d/%m/%Y')}</td>
                <td>{item.service_type}</td>
                <td>{item.start_time} - {item.end_time}</td>
                <td class="text-right">{float(item.hours):.2f}</td>
                <td class="text-right">${float(item.hourly_rate):,.2f}</td>
                <td class="text-right">${float(item.total_amount):,.2f}</td>
            </tr>
            """

        # Get participant address
        participant_address = ""
        if hasattr(participant, 'address_line1') and participant.address_line1:
            participant_address = f"{participant.address_line1}<br>"
            if hasattr(participant, 'address_line2') and participant.address_line2:
                participant_address += f"{participant.address_line2}<br>"
            if hasattr(participant, 'suburb') and participant.suburb:
                participant_address += f"{participant.suburb}, "
            if hasattr(participant, 'state') and participant.state:
                participant_address += f"{participant.state} "
            if hasattr(participant, 'postcode') and participant.postcode:
                participant_address += f"{participant.postcode}"

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {invoice.invoice_number}</title>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
            <div class="company-info">
                <h1>{self.organization_name}</h1>
                <p>
                    {self.organization_address}<br>
                    Phone: {self.organization_phone}<br>
                    Email: {self.organization_email}<br>
                    Website: {self.organization_website}
                </p>
            </div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
                <p class="invoice-number">{invoice.invoice_number}</p>
            </div>
        </div>

        <!-- Invoice Info -->
        <div class="invoice-info">
            <div class="bill-to">
                <h3>Bill To:</h3>
                <p>
                    <strong>{participant.full_name}</strong><br>
                    {participant_address}
                    {f'<br>NDIS Number: {participant.ndis_number}' if participant.ndis_number else ''}
                    {f'<br>Email: {participant.email_address}' if participant.email_address else ''}
                </p>
            </div>
            <div class="invoice-details">
                <table class="detail-table">
                    <tr>
                        <td><strong>Invoice Date:</strong></td>
                        <td>{issue_date}</td>
                    </tr>
                    <tr>
                        <td><strong>Due Date:</strong></td>
                        <td>{due_date}</td>
                    </tr>
                    <tr>
                        <td><strong>Billing Period:</strong></td>
                        <td>{billing_period}</td>
                    </tr>
                    <tr>
                        <td><strong>Payment Method:</strong></td>
                        <td>{invoice.payment_method.value.replace('_', ' ').title()}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Line Items -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Service Type</th>
                    <th>Time</th>
                    <th class="text-right">Hours</th>
                    <th class="text-right">Rate</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td>${float(invoice.subtotal):,.2f}</td>
                </tr>
                <tr>
                    <td>GST (10%):</td>
                    <td>${float(invoice.gst_amount):,.2f}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>Total Amount:</strong></td>
                    <td><strong>${float(invoice.total_amount):,.2f}</strong></td>
                </tr>
                {f'''<tr>
                    <td>Amount Paid:</td>
                    <td>${float(invoice.amount_paid):,.2f}</td>
                </tr>
                <tr class="outstanding-row">
                    <td><strong>Amount Outstanding:</strong></td>
                    <td><strong>${float(invoice.amount_outstanding):,.2f}</strong></td>
                </tr>''' if float(invoice.amount_paid) > 0 else ''}
            </table>
        </div>

        <!-- Footer -->
        <div class="invoice-footer">
            <p><strong>Payment Instructions:</strong></p>
            <p>
                Please ensure payment is made by the due date.<br>
                For any questions regarding this invoice, please contact us at {self.organization_email} or {self.organization_phone}.
            </p>
            {f'<p class="notes"><strong>Notes:</strong> {invoice.notes}</p>' if invoice.notes else ''}
        </div>

        <div class="invoice-footer-text">
            <p>Thank you for your business!</p>
        </div>
    </div>
</body>
</html>
        """

        return html

    def _get_invoice_styles(self) -> str:
        """Get CSS styles for invoice PDF"""
        return """
        @page {
            size: A4;
            margin: 2cm;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.6;
            color: #333;
        }

        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #10b981;
        }

        .company-info h1 {
            margin: 0 0 10px 0;
            color: #10b981;
            font-size: 24pt;
        }

        .company-info p {
            margin: 0;
            font-size: 9pt;
            line-height: 1.6;
        }

        .invoice-title {
            text-align: right;
        }

        .invoice-title h2 {
            margin: 0;
            font-size: 28pt;
            color: #059669;
        }

        .invoice-number {
            margin: 5px 0 0 0;
            font-size: 12pt;
            font-weight: bold;
            color: #666;
        }

        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }

        .bill-to, .invoice-details {
            width: 48%;
        }

        .bill-to h3 {
            margin: 0 0 10px 0;
            color: #059669;
            font-size: 12pt;
        }

        .bill-to p {
            margin: 0;
            line-height: 1.8;
        }

        .detail-table {
            width: 100%;
            border-collapse: collapse;
        }

        .detail-table td {
            padding: 5px 0;
            line-height: 1.6;
        }

        .detail-table td:first-child {
            width: 140px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .items-table thead tr {
            background-color: #10b981;
            color: white;
        }

        .items-table th {
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }

        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }

        .items-table tbody tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .text-right {
            text-align: right;
        }

        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }

        .totals-table {
            width: 300px;
            border-collapse: collapse;
        }

        .totals-table td {
            padding: 8px 15px;
            text-align: right;
        }

        .totals-table td:first-child {
            text-align: left;
        }

        .total-row td {
            border-top: 2px solid #333;
            padding-top: 10px;
            font-size: 12pt;
        }

        .outstanding-row td {
            color: #dc2626;
            font-size: 11pt;
        }

        .invoice-footer {
            margin-top: 30px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
        }

        .invoice-footer p {
            margin: 5px 0;
            font-size: 9pt;
        }

        .invoice-footer .notes {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
        }

        .invoice-footer-text {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }

        .invoice-footer-text p {
            margin: 0;
            color: #6b7280;
            font-size: 10pt;
        }
        """

    def cleanup_pdf(self, filepath: str) -> bool:
        """Delete a PDF file after it's been used"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Cleaned up PDF: {filepath}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error cleaning up PDF {filepath}: {str(e)}")
            return False
