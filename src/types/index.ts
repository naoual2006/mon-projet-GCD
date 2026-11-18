export type SubjectStatus =
  | 'draft'
  | 'proposed'
  | 'structure_validated'
  | 'ced_validated'
  | 'published'
  | 'rejected';

export interface ThesisSubject {
  id: string;
  title: string;
  titleAr: string;
  laboratory: string;
  laboratoryAr: string;
  cedoc: string;
  director: string;
  directorEmail: string;
  coDirector?: string;
  discipline: string;
  keywords: string[];
  summary: string;
  summaryAr: string;
  prerequisites: string;
  availableSlots: number;
  applicantsCount: number;
  deadline: string;
  status: SubjectStatus;
  rejectionReason?: string;
  proposedBy?: string;
  structureValidated?: boolean;
  cedValidated?: boolean;
}

export interface CandidateDocumentItem {
  name: string;
  size: string;
  status: 'valid' | 'pending' | 'rejected' | 'uploaded' | 'compressed';
  originalSize?: string;
  rejectionReason?: string;
  previewUrl?: string;
  mimeType?: string;
}

export interface CandidateProfile {
  cin: string;
  cne: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  gender?: 'M' | 'F' | '';
  birthDate: string; // YYYY-MM-DD
  cinExpiryDate?: string; // YYYY-MM-DD
  birthPlace: string;
  address: string;
  email: string;
  phone: string;
  masterDegree: string;
  masterSpecialty: string;
  masterUniversity: string;
  masterGraduationYear: string;
  masterGrade: string;
  masterMention: string;
  hasMasterThesis: boolean;
  masterThesisTitle: string;
  publicationsCount: number;
  englishLevel: string;
  documents: {
    cinDoc?: CandidateDocumentItem;
    masterDiploma?: CandidateDocumentItem;
    transcripts?: CandidateDocumentItem;
    cv?: CandidateDocumentItem;
    researchProposal?: CandidateDocumentItem;
  };
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'incomplete'
  | 'receivable'
  | 'opinions_given'
  | 'convoked'
  | 'interviewed'
  | 'pv_subject_ready'
  | 'pv_global_validated'
  | 'results_approved'
  | 'results_published'
  | 'place_confirmed'
  | 'renounced'
  | 'registered';

export interface TrackingMilestone {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming' | 'blocked' | 'rejected';
  date?: string;
  actor?: string;
  motif?: string;
}

export interface AiEvaluation {
  matchScore: number;
  statusColor: 'green' | 'orange' | 'red';
  statusLabel: string;
  statusLabelAr: string;
  summary: string;
  summaryAr: string;
  reasons: string[];
  strengths: string[];
  pointsToVerify: string[];
}

export interface AdminChecklistItem {
  key: string;
  label: string;
  required: boolean;
  status: 'valid' | 'pending' | 'rejected';
  rejectionReason?: string;
  note?: string;
  updatedAt?: string;
}

export interface SignatureStep {
  role: string;
  roleAr: string;
  signerName: string;
  isSigned: boolean;
  signedAt?: string;
  signatureHash?: string;
  isDelegated?: boolean;
  delegatedTo?: string;
}

export interface ConvocationDetails {
  date: string;
  time: string;
  location: string;
  note?: string;
}

export interface InterviewEvaluation {
  dossierScore: number;
  projectScore: number;
  oralScore: number;
  totalScore: number; // Max 20
  notes: string;
  evaluatorName: string;
  date: string;
}

export interface Application {
  id: string;
  folderNumber: string;
  subjectId: string;
  candidateId: string;
  candidate: CandidateProfile;
  subjectTitle: string;
  subjectDiscipline: string;
  subjectLab: string;
  directorName: string;
  status: ApplicationStatus;
  submissionDate: string;
  lastUpdateDate: string;
  trackingTimeline: TrackingMilestone[];
  aiAnalysis: AiEvaluation;
  administrativeChecklist: AdminChecklistItem[];
  signatures: {
    director: SignatureStep;
    labHead: SignatureStep;
    cedocHead: SignatureStep;
  };
  qrToken: string;
  physicalFileReceivedAt?: string;
  physicalReceivedBy?: string;
  rejectionReason?: string;
  rejectionFeedback?: string;
  notesTeacher?: string;
  teacherScore?: number;
  thesisDirectorOpinion?: 'favorable' | 'unfavorable' | 'pending';
  thesisDirectorMotif?: string;
  convocationDetails?: ConvocationDetails;
  interviewEvaluation?: InterviewEvaluation;
  wasAbsent?: boolean;
  rescheduledOnce?: boolean;
  selectionPvSigned?: boolean;
  selectionPvSignatureHash?: string;
  structureGlobalPvSigned?: boolean;
  cedResultsApproved?: boolean;
  finalResultDecision?: 'admitted' | 'waiting_list' | 'rejected' | 'pending';
  waitingListPosition?: number;
  confirmedAt?: string;
  renouncedAt?: string;
  renounceReason?: string;
  workflowCurrentStep: WorkflowStepNumber;
  workflowSteps: WorkflowStepDetail[];
  workflowHistory: WorkflowHistoryEntry[];
  workflowFinalDecision?: WorkflowFinalDecision;
  missingDocsRequested?: {
    documents: string[];
    requestedAt: string;
    deadline: string;
    status: 'pending' | 'provided';
    providedAt?: string;
  };
}

export interface InternalMessage {
  id: string;
  applicationId: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  content: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
}

// ==========================================
// MODULE 1 : WORKFLOW & NOTIFICATIONS TYPES
// ==========================================

export type WorkflowStepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type WorkflowStepStatus = 'completed' | 'current' | 'upcoming' | 'blocked' | 'rejected';

export type WorkflowFinalDecision = 'admitted' | 'waiting_list' | 'rejected' | 'pending';

export interface WorkflowStepDetail {
  stepNumber: WorkflowStepNumber;
  label: string;
  labelAr: string;
  responsibleRole: string;
  description: string;
  status: WorkflowStepStatus;
  validatedAt?: string;
  validatedBy?: string;
  validatorRole?: string;
  comment?: string;
  blockedAt?: string;
  blockedBy?: string;
  blockReason?: string;
  missingDocuments?: string[];
  missingDocDeadline?: string;
  finalDecision?: WorkflowFinalDecision;
}

export interface WorkflowHistoryEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  stepNumber: WorkflowStepNumber;
  stepLabel: string;
  action: 'created' | 'validated' | 'blocked' | 'documents_submitted' | 'decision_rendered' | 'opinion_given' | 'registered';
  actionLabel: string;
  comment?: string;
  motif?: string;
  missingDocs?: string[];
}

export interface NotificationItem {
  id: string;
  recipientUserId: string;
  recipientRole: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  date: string;
  read: boolean;
  type: 'validation' | 'blocked' | 'missing_docs' | 'reminder' | 'decision' | 'info';
  applicationId: string;
  stepNumber?: WorkflowStepNumber;
  missingDocuments?: string[];
  deadline?: string;
}

export interface SentEmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  sentAt: string;
  status: 'delivered' | 'pending';
  triggerEvent: string;
}

// ==========================================
// MODULE 2 : PRIVILEGES & RBAC TYPES
// ==========================================

export type RoleId =
  | 'candidate'
  | 'thesis_director'
  | 'structure_director'
  | 'commission'
  | 'ced_director'
  | 'gcd_admin';

export type PermissionKey =
  | 'view_subjects'
  | 'use_cart'
  | 'apply_subject'
  | 'track_own'
  | 'propose_subjects'
  | 'evaluate_own_subjects'
  | 'validate_structure_subjects'
  | 'evaluate_structure_apps'
  | 'examine_assigned_apps'
  | 'schedule_interview'
  | 'rank_candidates'
  | 'publish_subjects'
  | 'render_final_decision'
  | 'view_global_stats'
  | 'check_admin_completeness'
  | 'flag_incomplete'
  | 'manage_campaign_dates'
  | 'finalize_registration'
  | 'manage_users'
  | 'manage_privileges';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  nameAr: string;
  description: string;
  isSystem: boolean;
  badgeColor: string;
  permissions: PermissionKey[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  roleId: RoleId; // Primary or active role
  roles: RoleId[]; // All assigned roles for this user
  status: 'active' | 'suspended';
  lastLogin: string;
  scope?: string;
}

export interface PrivilegeAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  formerRole: string;
  newRole: string;
  details: string;
}

export interface SystemConfig {
  maxApplicationsPerCandidate: number;
  campaignStartDate: string;
  campaignEndDate: string;
}
