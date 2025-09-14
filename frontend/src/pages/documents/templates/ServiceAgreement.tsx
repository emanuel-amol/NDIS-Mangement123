import * as React from "react";

// export the prop types so callers can import & use them
export type PricingItem = { name: string; rate: number; hours: number };

export interface ServiceAgreementProps {
  participant: { full_name: string; ndis_number?: string; address?: string };
  pricing: PricingItem[];
  care_requirements?: string[];
  risk_assessment?: { summary?: string };
  generated_at?: string;
}

// NOTE: this file should ONLY export the component.
// DO NOT render <ServiceAgreement .../> inside this file.
const ServiceAgreement: React.FC<ServiceAgreementProps> = (props) => {
  const total = (props.pricing ?? []).reduce((s, p) => s + p.rate * p.hours, 0);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>NDIS Service Agreement</title>
        <style>{`
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          h2 { font-size: 16px; margin-top: 18px; }
          .box { border: 1px solid #777; padding: 10px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
        `}</style>
      </head>
      <body>
        <h1>NDIS Service Agreement</h1>
        <p>Generated: {props.generated_at ?? new Date().toISOString()}</p>

        <div className="box">
          <strong>Participant:</strong> {props.participant.full_name}<br/>
          <strong>NDIS Number:</strong> {props.participant.ndis_number ?? "-"}<br/>
          <strong>Address:</strong> {props.participant.address ?? "-"}
        </div>

        <h2>Support Items & Rates</h2>
        <table>
          <thead><tr><th>Service</th><th>Rate (AUD/hr)</th><th>Hours</th><th>Total</th></tr></thead>
          <tbody>
            {(props.pricing ?? []).map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>{item.rate.toFixed(2)}</td>
                <td>{item.hours}</td>
                <td>{(item.rate * item.hours).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3} style={{ textAlign: "right" }}>Grand Total</th>
              <th>{total.toFixed(2)}</th>
            </tr>
          </tfoot>
        </table>

        {!!props.care_requirements?.length && (
          <>
            <h2>Care Requirements</h2>
            <ul>
              {props.care_requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </>
        )}

        {props.risk_assessment?.summary && (
          <>
            <h2>Risk Assessment Summary</h2>
            <p>{props.risk_assessment.summary}</p>
          </>
        )}
      </body>
    </html>
  );
};

export default ServiceAgreement;

