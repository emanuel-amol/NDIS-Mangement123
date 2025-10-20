
# backend/app/services/pdf_fallback.py
"""
Fallback PDF generation using ReportLab when WeasyPrint is not available
"""

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

def generate_pdf_with_reportlab(html_content, template_name="Document"):
    """Generate PDF using ReportLab as fallback"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("ReportLab is not available")
    
    from io import BytesIO
    import re
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Simple HTML to text conversion (basic)
    # Remove HTML tags and convert to plain text
    text_content = re.sub(r'<[^>]+>', '', html_content)
    text_content = text_content.replace('&nbsp;', ' ')
    text_content = text_content.replace('&amp;', '&')
    
    # Split into lines and create paragraphs
    lines = text_content.split('\n')
    for line in lines:
        if line.strip():
            p = Paragraph(line.strip(), styles['Normal'])
            story.append(p)
            story.append(Spacer(1, 12))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
