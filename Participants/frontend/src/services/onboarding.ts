// frontend/src/services/onboarding.ts - COMPLETE WITH EMAIL FUNCTIONALITY
import { withAuth } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface OnboardingPackItem {
  title: string;
  category: string;
  status: 'signed' | 'pending_signature' | 'ready' | 'MISSING';
  document_id?: number;
  envelope_id?: number;
}

export interface OnboardingPackResponse {
  participant_id: number;
  participant_name: string;
  onboarding_documents_generated: number;
  documents: Array<{
    id: number;
    title: string;
    category: string;
    status: string;
    created_at: string;
  }>;
  total_envelopes: number;
  pending_signatures: number;
  completed_signatures: number;
  envelopes: Array<{
    id: number;
    signer_name: string;
    signer_email: string;
    signer_role: string;
    status: string;
    created_at: string;
    signed_at: string | null;
    expires_at: string;
    document_count: number;
  }>;
  onboarding_complete: boolean;
  // Computed fields for UI
  items: OnboardingPackItem[];
  missing_count: number;
  pending_signature_count: number;
  signed_count: number;
  all_required_complete: boolean;
}

export interface SendPackRequest {
  signer_name: string;
  signer_email: string;
  signer_role: 'participant' | 'guardian';
}

export interface SendPackResponse {
  message: string;
  envelope_id: number;
  participant_id: number;
  participant_name: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  token: string;
  public_url: string;
  status: string;
  expires_at: string;
  documents_generated: number;
  document_ids: number[];
  email_sent: boolean;  // ✅ EMAIL STATUS
  email_status: string; // ✅ EMAIL STATUS
  generation_errors: string[] | null;
}

export interface ResendInvitationResponse {
  message: string;
  envelope_id: number;
  signer_email: string;
  email_sent: boolean;  // ✅ EMAIL STATUS
  signing_url: string;
}

export interface GenerateDocumentsResponse {
  message: string;
  participant_id: number;
  participant_name: string;
  documents_generated: number;
  documents: Array<{
    id: number;
    title: string;
    filename: string;
    template_id: string;
    file_size: number;
    file_url: string;
  }>;
  generation_errors: string[] | null;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  required?: boolean;
}

export interface TemplatesResponse {
  participant_id: number;
  participant_name: string;
  available_templates: OnboardingTemplate[];
  total_templates: number;
}

export interface CancelEnvelopeRequest {
  reason?: string;
}

export interface CancelEnvelopeResponse {
  message: string;
  envelope_id: number;
  status: string;
  reason?: string;
}

/**
 * Get onboarding pack status for a participant
 * Shows document generation status and signature status
 */
export async function getOnboardingPack(participantId: number): Promise<OnboardingPackResponse> {
  const response = await fetch(
    `${API_BASE_URL}/participants/${participantId}/onboarding/status`,
    {
      headers: withAuth(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load onboarding pack: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Transform the data to include computed fields for the UI
  const requiredTemplates = [
    { id: 'ndis_service_agreement', title: 'NDIS Service Agreement', category: 'Service Agreements' },
    { id: 'participant_handbook', title: 'Participant Handbook', category: 'Intake Documents' },
    { id: 'medical_consent_form', title: 'Medical Consent Form', category: 'Medical Consent' },
  ];

  const items: OnboardingPackItem[] = requiredTemplates.map(template => {
    // Find matching document
    const doc = data.documents.find((d: any) => 
      d.title.toLowerCase().includes(template.title.toLowerCase()) ||
      d.category === template.category
    );

    // Find matching envelope (use the most recent active envelope)
    const envelope = data.envelopes
      .filter((e: any) => e.status !== 'cancelled')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!doc) {
      return {
        title: template.title,
        category: template.category,
        status: 'MISSING' as const,
      };
    }

    if (envelope?.status === 'signed') {
      return {
        title: doc.title,
        category: doc.category,
        status: 'signed' as const,
        document_id: doc.id,
        envelope_id: envelope.id,
      };
    }

    if (envelope?.status === 'pending' || envelope?.status === 'viewed') {
      return {
        title: doc.title,
        category: doc.category,
        status: 'pending_signature' as const,
        document_id: doc.id,
        envelope_id: envelope.id,
      };
    }

    return {
      title: doc.title,
      category: doc.category,
      status: 'ready' as const,
      document_id: doc.id,
    };
  });

  const missing_count = items.filter(i => i.status === 'MISSING').length;
  const pending_signature_count = items.filter(i => i.status === 'pending_signature').length;
  const signed_count = items.filter(i => i.status === 'signed').length;
  const all_required_complete = missing_count === 0 && pending_signature_count === 0 && signed_count === requiredTemplates.length;

  return {
    ...data,
    items,
    missing_count,
    pending_signature_count,
    signed_count,
    all_required_complete,
  };
}

/**
 * ✅ SEND ONBOARDING PACK WITH EMAIL
 * Generates documents, creates signing envelope, and SENDS EMAIL invitation
 * This is the main function for sending onboarding packs
 */
export async function sendOnboardingPack(
  participantId: number,
  payload: SendPackRequest
): Promise<SendPackResponse> {
  const response = await fetch(
    `${API_BASE_URL}/participants/${participantId}/onboarding/send-pack`,
    {
      method: 'POST',
      headers: {
        ...withAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send onboarding pack');
  }

  const result = await response.json();
  
  // Log email status for debugging
  console.log('📧 Onboarding pack sent:', {
    envelope_id: result.envelope_id,
    email_sent: result.email_sent,
    email_status: result.email_status,
    signer_email: result.signer_email
  });

  return result;
}

/**
 * ✅ RESEND EMAIL INVITATION
 * Resend the signing invitation email for an existing envelope
 * Useful when:
 * - Email was not received
 * - Email expired
 * - Signer needs a reminder
 */
export async function resendInvitation(
  participantId: number,
  envelopeId: number
): Promise<ResendInvitationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/participants/${participantId}/onboarding/resend-invitation`,
    {
      method: 'POST',
      headers: {
        ...withAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ envelope_id: envelopeId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to resend invitation');
  }

  const result = await response.json();
  
  // Log email status for debugging
  console.log('📧 Invitation resent:', {
    envelope_id: result.envelope_id,
    email_sent: result.email_sent,
    signer_email: result.signer_email
  });

  return result;
}

/**
 * Generate onboarding documents WITHOUT sending email
 * Use this to preview or generate documents before creating a signing envelope
 */
export async function generateOnboardingDocuments(
  participantId: number,
  templateIds?: string[]
): Promise<GenerateDocumentsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/participants/${participantId}/onboarding/generate-documents`,
    {
      method: 'POST',
      headers: {
        ...withAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ template_ids: templateIds }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate documents');
  }

  return response.json();
}

/**
 * Get list of available onboarding document templates
 */
export async function getAvailableTemplates(participantId: number): Promise<TemplatesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/participants/${participantId}/onboarding/templates`,
    {
      headers: withAuth(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load templates: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Cancel an onboarding signing envelope
 * Use this to:
 * - Cancel incorrect envelopes
 * - Stop expired signing processes
 * - Clean up pending envelopes
 */
export async function cancelEnvelope(
  participantId: number,
  envelopeId: number,
  reason?: string
): Promise<CancelEnvelopeResponse> {
  const response = await fetch(
    `${API_BASE_URL}/participants/${participantId}/onboarding/envelope/${envelopeId}`,
    {
      method: 'DELETE',
      headers: {
        ...withAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to cancel envelope');
  }

  return response.json();
}

/**
 * ✅ UTILITY: Check if email service is configured
 * Returns whether the backend can send emails
 */
export async function checkEmailConfiguration(): Promise<{
  success: boolean;
  message: string;
  smtp_configured: boolean;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/email/test`,
      {
        method: 'POST',
        headers: withAuth(),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        message: 'Email service not available',
        smtp_configured: false
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: 'Could not check email configuration',
      smtp_configured: false
    };
  }
}

/**
 * ✅ UTILITY: Format email status for display
 */
export function formatEmailStatus(emailStatus: string): {
  text: string;
  color: string;
  icon: string;
} {
  switch (emailStatus) {
    case 'sent':
      return {
        text: 'Email Sent',
        color: 'text-green-600',
        icon: '✅'
      };
    case 'failed':
      return {
        text: 'Email Failed',
        color: 'text-red-600',
        icon: '❌'
      };
    case 'pending':
      return {
        text: 'Email Pending',
        color: 'text-yellow-600',
        icon: '⏳'
      };
    default:
      return {
        text: 'Unknown Status',
        color: 'text-gray-600',
        icon: '❓'
      };
  }
}

/**
 * ✅ UTILITY: Get human-readable envelope status
 */
export function formatEnvelopeStatus(status: string): {
  text: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'pending':
      return {
        text: 'Awaiting Signature',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100'
      };
    case 'viewed':
      return {
        text: 'Viewed - Not Signed',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100'
      };
    case 'signed':
      return {
        text: 'Signed ✓',
        color: 'text-green-700',
        bgColor: 'bg-green-100'
      };
    case 'declined':
      return {
        text: 'Declined',
        color: 'text-red-700',
        bgColor: 'bg-red-100'
      };
    case 'expired':
      return {
        text: 'Expired',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
    case 'cancelled':
      return {
        text: 'Cancelled',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
    default:
      return {
        text: status,
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
  }
}

/**
 * ✅ UTILITY: Check if envelope can be resent
 */
export function canResendEnvelope(envelope: any): boolean {
  return ['pending', 'viewed', 'expired'].includes(envelope.status);
}

/**
 * ✅ UTILITY: Check if envelope can be cancelled
 */
export function canCancelEnvelope(envelope: any): boolean {
  return !['signed', 'cancelled'].includes(envelope.status);
}

/**
 * ✅ FULL WORKFLOW: Generate, send, and track onboarding pack
 * This combines all steps for a complete onboarding process
 */
export async function initiateOnboarding(
  participantId: number,
  signerInfo: SendPackRequest,
  templateIds?: string[]
): Promise<{
  success: boolean;
  envelope_id?: number;
  public_url?: string;
  email_sent: boolean;
  documents_generated: number;
  errors?: string[];
}> {
  try {
    // Step 1: Generate documents if templates specified
    if (templateIds && templateIds.length > 0) {
      const genResult = await generateOnboardingDocuments(participantId, templateIds);
      if (genResult.generation_errors && genResult.generation_errors.length > 0) {
        console.warn('⚠️ Some documents had generation errors:', genResult.generation_errors);
      }
    }

    // Step 2: Send pack with email
    const sendResult = await sendOnboardingPack(participantId, signerInfo);

    return {
      success: true,
      envelope_id: sendResult.envelope_id,
      public_url: sendResult.public_url,
      email_sent: sendResult.email_sent,
      documents_generated: sendResult.documents_generated,
      errors: sendResult.generation_errors || undefined
    };
  } catch (error: any) {
    console.error('❌ Failed to initiate onboarding:', error);
    return {
      success: false,
      email_sent: false,
      documents_generated: 0,
      errors: [error.message]
    };
  }
}

// Export all types and functions
export default {
  getOnboardingPack,
  sendOnboardingPack,
  resendInvitation,
  generateOnboardingDocuments,
  getAvailableTemplates,
  cancelEnvelope,
  checkEmailConfiguration,
  formatEmailStatus,
  formatEnvelopeStatus,
  canResendEnvelope,
  canCancelEnvelope,
  initiateOnboarding,
};