import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  X,
  Lock,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { CandidateDocumentItem, CandidateProfile, ThesisSubject } from '../../types';
import { Language, translations } from '../../i18n/translations';
import {
  extractAndPreprocessMrzRegion,
  runRealMrzOcr,
  CnieExtractedResult,
  validateMoroccanCin,
} from '../../utils/cnieOcrParser';
import { computeMasterMention, formatData, formatPhoneStandard } from '../../utils/formatData';

interface ApplicationWizardProps {
  selectedSubject: ThesisSubject;
  onApplicationSubmitted: (profile: CandidateProfile) => void;
  lang: Language;
  isOnline: boolean;
  alreadyApplied?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const REQUIRED_DOCUMENTS: { key: keyof CandidateProfile['documents']; label: string; required: boolean }[] = [
  { key: 'cinDoc', label: 'Carte Nationale d\'Identité (CNIE recto-verso)', required: true },
  { key: 'masterDiploma', label: 'Diplôme de Master', required: true },
  { key: 'transcripts', label: 'Relevés de notes Master (S1 à S4)', required: true },
  { key: 'cv', label: 'Curriculum Vitae (CV normalisé)', required: true },
  { key: 'researchProposal', label: 'Avant-projet de thèse rédigé', required: true },
];

export const ApplicationWizard: React.FC<ApplicationWizardProps> = ({
  selectedSubject,
  onApplicationSubmitted,
  lang,
  alreadyApplied = false,
}) => {
  const t = translations[lang];

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [lastSavedTime, setLastSavedTime] = useState<string>('--:--');

  // STEP 1: Law 09-08 Consent & Real OCR States
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedResult, setExtractedResult] = useState<CnieExtractedResult | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // STEP 3: Real File Upload, Validation & Preview
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; item: CandidateDocumentItem } | null>(null);
  const docFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // STEP 4: Mandatory Honor Declaration
  const [isHonorDeclared, setIsHonorDeclared] = useState<boolean>(false);

  // Candidate Profile Form (NO pre-selected "Très Bien" mention)
  const [profile, setProfile] = useState<CandidateProfile>({
    cin: '',
    cne: '',
    firstName: '',
    lastName: '',
    firstNameAr: '',
    lastNameAr: '',
    gender: '',
    birthDate: '',
    cinExpiryDate: '',
    birthPlace: '',
    address: '',
    email: '',
    phone: '',
    masterDegree: '',
    masterSpecialty: '',
    masterUniversity: '',
    masterGraduationYear: '2025',
    masterGrade: '',
    masterMention: '',
    hasMasterThesis: true,
    masterThesisTitle: '',
    publicationsCount: 0,
    englishLevel: 'B2',
    documents: {},
  });

  // Load saved candidate profile draft on mount (excluding temporary blob previewUrls)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('doccycle_candidate_draft_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          masterMention: parsed.masterGrade ? computeMasterMention(parsed.masterGrade) : (parsed.masterMention || ''),
        }));
      }
    } catch (e) {
      console.error('Error loading candidate draft:', e);
    }
  }, []);

  // Auto-Save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setLastSavedTime(timeStr);
      try {
        localStorage.setItem('doccycle_candidate_draft_v5', JSON.stringify(profile));
      } catch (e) {
        console.error(e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [profile, currentStep]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleOpenRearCamera = async () => {
    if (!hasConsent) return;
    setOcrError(null);
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCameraOpen(false);
      setOcrError(
        lang === 'fr'
          ? 'Impossible d\'accéder à la caméra arrière. Utilisez le bouton « Téléverser une image ».'
          : 'تعذر تشغيل الكاميرا. يرجى استخدام تحميل صورة.'
      );
    }
  };

  const handleCaptureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCameraStream();
    setIsCameraOpen(false);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cnie-capture.jpg', { type: 'image/jpeg' });
        processCnieImage(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCnieImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (hasConsent) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!hasConsent) return;
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.includes('image/') || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.png'))) {
      processCnieImage(file);
    }
  };

  const processCnieImage = async (file: File) => {
    setIsProcessingOcr(true);
    setOcrError(null);
    setOcrProgress(15);
    setOcrStatusText(lang === 'fr' ? 'Prétraitement de l\'image...' : 'معالجة الصورة...');

    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);

      const preprocessed = await extractAndPreprocessMrzRegion(file);
      setOcrProgress(40);
      setOcrStatusText(lang === 'fr' ? 'Lecture OCR en cours...' : 'التعرف الضوئي...');

      const result = await runRealMrzOcr(preprocessed.mrzCanvasDataUrl, (progress) => {
        setOcrProgress(40 + Math.floor(progress * 55));
      });

      setOcrProgress(100);
      setOcrStatusText(lang === 'fr' ? 'Extraction terminée !' : 'اكتمل الاستخراج');
      setExtractedResult(result);

      if (result) {
        const updatedProfile = { ...profile };
        if (result.lastName) updatedProfile.lastName = result.lastName;
        if (result.firstName) updatedProfile.firstName = result.firstName;
        if (result.cin) updatedProfile.cin = result.cin;
        if (result.birthDateIso) updatedProfile.birthDate = result.birthDateIso;
        if (result.gender) updatedProfile.gender = result.gender;
        if (result.expiryDateIso) updatedProfile.cinExpiryDate = result.expiryDateIso;
        setProfile(updatedProfile);
      }
    } catch (err: any) {
      console.error('MRZ Extraction Error:', err);
      setOcrError(err?.message || (lang === 'fr' ? 'Échec de la lecture MRZ.' : 'فشل قراءة MRZ'));
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleResetScan = () => {
    setImagePreviewUrl(null);
    setExtractedResult(null);
    setOcrError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Real File Upload Handler for Step 3 (PDF, JPG, PNG; max 10 MB)
  const handleDocumentUpload = (docKey: keyof CandidateProfile['documents'], file?: File) => {
    if (!file) return;
    setDocUploadError(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidType = ACCEPTED_MIME_TYPES.includes(file.type) || ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
    if (!isValidType) {
      setDocUploadError(`Format non accepté pour "${file.name}". Utilisez PDF, JPG ou PNG.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setDocUploadError(`Le fichier "${file.name}" dépasse la taille maximale autorisée de 10 Mo.`);
      return;
    }

    const sizeFormatted =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
        : `${Math.max(1, Math.round(file.size / 1024))} Ko`;

    const previewUrl = URL.createObjectURL(file);
    const newItem: CandidateDocumentItem = {
      name: file.name,
      size: sizeFormatted,
      status: 'uploaded',
      previewUrl,
      mimeType: file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    };

    setProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: newItem,
      },
    }));
  };

  const handleGradeChange = (rawGrade: string) => {
    const computedMention = computeMasterMention(rawGrade);
    setProfile((prev) => ({
      ...prev,
      masterGrade: rawGrade,
      masterMention: computedMention,
    }));
  };

  const stepsList = [
    { num: 1, label: t.wizard.step1 },
    { num: 2, label: t.wizard.step2 },
    { num: 3, label: t.wizard.step3 },
    { num: 4, label: t.wizard.step4 },
  ];

  const uploadedDocsCount = REQUIRED_DOCUMENTS.filter((d) => Boolean(profile.documents[d.key])).length;

  return (
    <div className="space-y-6 pb-28">

      {/* 1. Compact Selected Subject Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 flex items-center justify-between gap-4 shadow-2xs">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-slate-900 truncate">
            {selectedSubject.title}
          </div>
          <div className="text-[13px] text-slate-500 truncate">
            {selectedSubject.laboratory} · Directeur : {selectedSubject.director}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 text-[12px] text-slate-500">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Enregistré à {lastSavedTime}</span>
        </div>
      </div>

      {alreadyApplied && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-900 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Vous avez déjà une <strong>candidature en cours</strong> sur ce sujet. Votre dossier est verrouillé après soumission.
          </span>
        </div>
      )}

      {/* 2. Fine 4-Step Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs">
        <div className="grid grid-cols-4 gap-2">
          {stepsList.map((step) => {
            const isDone = currentStep > step.num;
            const isActive = currentStep === step.num;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (isDone || isActive) setCurrentStep(step.num);
                }}
                disabled={!isDone && !isActive}
                className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white font-semibold shadow-2xs cursor-pointer'
                    : isDone
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 cursor-pointer'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isActive
                      ? 'bg-white text-[#1E3A8A]'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : step.num}
                </div>
                <span className="text-[13px] truncate hidden sm:inline">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SCAN CNIE & IDENTITÉ */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-5">

            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="text-[15px] font-medium text-slate-800">
                Scannez le verso de votre CNIE marocaine pour pré-remplir automatiquement le formulaire.
              </div>

              <div className="relative group shrink-0">
                <button
                  type="button"
                  aria-label="Conformité CNDP Loi 09-08"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:block absolute right-0 top-8 z-50 w-72 p-2.5 bg-slate-900 text-white text-[12px] rounded-lg shadow-xl leading-relaxed">
                  Conformité CNDP Loi 09-08 : Traitement OCR 100% local dans votre navigateur. Aucune image de votre pièce d'identité n'est stockée ni transmise.
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => {
                  setHasConsent(e.target.checked);
                  if (!e.target.checked) {
                    stopCameraStream();
                    setIsCameraOpen(false);
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-[13px] text-slate-700 leading-snug">
                Je consens à l'extraction locale de mes données d'état civil depuis ma CNIE pour cette candidature.
              </span>
            </label>

            {ocrError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-[13px] text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Lecture non aboutie</span>
                  <span>{ocrError}</span>
                </div>
              </div>
            )}

            {!isCameraOpen && !imagePreviewUrl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={!hasConsent}
                  onClick={handleOpenRearCamera}
                  className={`p-5 rounded-xl border border-dashed flex items-center gap-3.5 transition-all text-left min-h-[44px] ${
                    hasConsent
                      ? 'bg-white hover:bg-slate-50 border-[#1E3A8A] text-slate-900 cursor-pointer shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-slate-900">Scanner avec la caméra</div>
                    <div className="text-[12px] text-slate-500">Caméra arrière mobile avec cadre de guidage</div>
                  </div>
                </button>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (hasConsent && fileInputRef.current) fileInputRef.current.click();
                  }}
                  className={`p-5 rounded-xl border border-dashed flex items-center gap-3.5 transition-all text-left min-h-[44px] ${
                    !hasConsent
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      : isDragging
                      ? 'bg-blue-50 border-[#1E3A8A] text-[#1E3A8A] cursor-pointer'
                      : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900 cursor-pointer shadow-2xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-slate-900">Téléverser une image</div>
                    <div className="text-[12px] text-slate-500">JPG ou PNG (glisser-déposer accepté)</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    disabled={!hasConsent}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {isCameraOpen && (
              <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 text-white space-y-3">
                <div className="flex items-center justify-between text-[13px] pb-1 border-b border-slate-800">
                  <span className="font-medium flex items-center gap-2 text-slate-200">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Cadrez les 3 lignes MRZ au verso de votre carte</span>
                  </span>
                  <button
                    onClick={() => {
                      stopCameraStream();
                      setIsCameraOpen(false);
                    }}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative aspect-video max-h-72 w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-4 sm:inset-6 border-2 border-white/80 rounded-xl pointer-events-none flex flex-col justify-end p-2">
                    <div className="h-14 border border-dashed border-emerald-400 bg-emerald-500/20 rounded-lg flex items-center justify-center text-center p-1">
                      <span className="text-[11px] font-mono font-bold text-emerald-300">
                        &lt;&lt;&lt; ALIGNER LES 3 LIGNES MRZ ICI &lt;&lt;&lt;
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] text-white font-semibold rounded-lg text-[14px] flex items-center gap-2 cursor-pointer shadow-sm min-h-[44px]"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Capturer & Analyser</span>
                  </button>
                </div>
              </div>
            )}

            {isProcessingOcr && (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2.5">
                <div className="w-8 h-8 border-3 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-[14px] font-semibold text-slate-900">{ocrStatusText}</div>
                <div className="w-full max-w-xs bg-slate-200 rounded-full h-1.5 mx-auto overflow-hidden">
                  <div className="bg-[#1E3A8A] h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}

            {imagePreviewUrl && !isProcessingOcr && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-11 bg-slate-900 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={imagePreviewUrl} alt="Aperçu carte" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-slate-900 block">
                      {extractedResult ? 'Données extraites' : 'Image analysée'}
                    </span>
                    <span className="text-[12px] text-slate-500 block">
                      Vérifiez les champs ci-dessous.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  Changer d'image
                </button>
              </div>
            )}

            <div className="pt-2 space-y-4">
              <div className="text-[14px] font-semibold text-slate-900">
                Informations d'état civil
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-[13px]">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.lastName}</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 font-semibold"
                    placeholder="ex. ALAMI"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.firstName}</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 font-semibold"
                    placeholder="ex. Prénom"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.cin}</label>
                  <input
                    type="text"
                    value={profile.cin}
                    onChange={(e) => setProfile({ ...profile, cin: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    className={`w-full px-3.5 py-2.5 rounded-lg font-mono-folder font-bold text-slate-900 border focus:ring-2 focus:outline-none ${
                      !profile.cin || validateMoroccanCin(profile.cin)
                        ? 'border-slate-200 focus:ring-[#1E3A8A]'
                        : 'border-rose-300 bg-rose-50/50 focus:ring-rose-500'
                    }`}
                    placeholder="ex. CD584920"
                  />
                  {profile.cin && !validateMoroccanCin(profile.cin) && (
                    <p className="text-[12px] text-rose-600 font-medium mt-1">
                      Format invalide (ex: CD584920)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.birthDate}</label>
                  <input
                    type="date"
                    value={profile.birthDate}
                    onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sexe</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value as 'M' | 'F' | '' })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 cursor-pointer"
                  >
                    <option value="">Sélectionner</option>
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Expiration CIN</label>
                  <input
                    type="date"
                    value={profile.cinExpiryDate}
                    onChange={(e) => setProfile({ ...profile, cinExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.cne}</label>
                  <input
                    type="text"
                    value={profile.cne}
                    onChange={(e) => setProfile({ ...profile, cne: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 font-mono-folder"
                    placeholder="ex. N138249502"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.email}</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                    placeholder="prenom.nom@exemple.ma"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.phone}</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    onBlur={(e) => setProfile({ ...profile, phone: formatPhoneStandard(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 font-mono-folder"
                    placeholder="+212 6 XX XX XX XX"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block font-medium text-slate-700 mb-1">{t.wizard.address}</label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                    placeholder="ex. 12 Avenue des FAR, Fès"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CURSUS UNIVERSITAIRE */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="text-[18px] font-bold text-slate-900">
            Cursus universitaire
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Diplôme de Master</label>
              <input
                type="text"
                value={profile.masterDegree}
                onChange={(e) => setProfile({ ...profile, masterDegree: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                placeholder="ex. Diplôme de Master Systèmes Intelligents"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{t.wizard.masterUniversity}</label>
              <input
                type="text"
                value={profile.masterUniversity}
                onChange={(e) => setProfile({ ...profile, masterUniversity: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                placeholder="ex. FST Fès / USMBA"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{t.wizard.masterGrade} (/ 20)</label>
              <input
                type="text"
                value={profile.masterGrade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 font-mono-folder"
                placeholder="ex. 15.60"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t.wizard.masterMention} <span className="text-[11px] text-slate-400">(calculée depuis la moyenne)</span>
              </label>
              <input
                type="text"
                readOnly
                value={profile.masterMention || 'Saisissez la moyenne pour calculer la mention'}
                className={`w-full px-3.5 py-2.5 border rounded-lg font-semibold ${
                  profile.masterMention
                    ? 'bg-slate-50 border-slate-200 text-[#1E3A8A]'
                    : 'bg-slate-50 border-slate-200 text-slate-400 italic font-normal'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">{t.wizard.thesisTitle}</label>
              <input
                type="text"
                value={profile.masterThesisTitle}
                onChange={(e) => setProfile({ ...profile, masterThesisTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900"
                placeholder="Intitulé du mémoire de fin d'études de Master"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{t.wizard.pubCount}</label>
              <input
                type="number"
                min="0"
                value={profile.publicationsCount}
                onChange={(e) => setProfile({ ...profile, publicationsCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 font-mono-folder"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Niveau d'anglais</label>
              <select
                value={profile.englishLevel}
                onChange={(e) => setProfile({ ...profile, englishLevel: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none text-slate-900 cursor-pointer"
              >
                <option value="C1">C1 - Avancé / Autonome</option>
                <option value="B2">B2 - Intermédiaire supérieur</option>
                <option value="B1">B1 - Intermédiaire</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PIÈCES JUSTIFICATIVES (UNIFIED PDF/JPG/PNG + MAX SIZE + PREVIEW + REPLACE) */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="text-[18px] font-bold text-slate-900">Pièces justificatives</div>
              <div className="text-[13px] text-slate-500 mt-0.5">
                Formats acceptés pour toutes les pièces : <strong>PDF, JPG, PNG</strong> · Taille maximale : <strong>10 Mo par fichier</strong>.
              </div>
            </div>
            <span className="text-[12px] font-semibold text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 shrink-0">
              {uploadedDocsCount} / {REQUIRED_DOCUMENTS.length} pièces jointes
            </span>
          </div>

          {docUploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-[13px] text-rose-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{docUploadError}</span>
              </div>
              <button type="button" onClick={() => setDocUploadError(null)} className="text-rose-600 font-bold cursor-pointer">✕</button>
            </div>
          )}

          <div className="space-y-3">
            {REQUIRED_DOCUMENTS.map((doc) => {
              const docItem = profile.documents[doc.key];
              const hasFile = Boolean(docItem);

              return (
                <div
                  key={doc.key}
                  className="p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{doc.label}</span>
                      {doc.required && <span className="text-rose-500">*</span>}
                    </div>
                    {docItem ? (
                      <div className="text-[12px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1.5 truncate">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{docItem.name}</span>
                        <span className="text-slate-400">({docItem.size})</span>
                      </div>
                    ) : (
                      <div className="text-[12px] text-slate-400 mt-0.5">
                        PDF, JPG ou PNG · Max 10 Mo
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={(el) => { docFileInputRefs.current[doc.key] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleDocumentUpload(doc.key, file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    {hasFile && docItem && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ label: doc.label, item: docItem })}
                        className="px-3 py-2 rounded-lg text-[13px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5"
                      >
                        <Eye className="w-4 h-4 text-[#1E3A8A]" />
                        <span>Aperçu</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => docFileInputRefs.current[doc.key]?.click()}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 ${
                        hasFile
                          ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                          : 'bg-[#1E3A8A] text-white hover:bg-[#172554]'
                      }`}
                    >
                      {hasFile ? <RefreshCw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                      <span>{hasFile ? 'Remplacer' : 'Téléverser'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: RÉCAPITULATIF COMPLET, DÉCLARATION OBLIGATOIRE & AVERTISSEMENT */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="text-[18px] font-bold text-slate-900">
            Récapitulatif complet de candidature
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            {/* Identité */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1.5 mb-2">1. Identité du candidat</span>
              <div>Nom & Prénom : <strong>{formatData(`${profile.lastName} ${profile.firstName}`.trim())}</strong></div>
              <div>N° CIN : <strong className="font-mono-folder">{formatData(profile.cin)}</strong></div>
              <div>CNE / Massar : <strong className="font-mono-folder">{formatData(profile.cne)}</strong></div>
              <div>Date de naissance : <strong>{formatData(profile.birthDate)}</strong></div>
              <div>E-mail : <strong>{formatData(profile.email)}</strong></div>
              <div>Téléphone : <strong className="font-mono-folder">{formatData(profile.phone)}</strong></div>
              <div>Adresse : <strong>{formatData(profile.address)}</strong></div>
            </div>

            {/* Cursus universitaire */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1.5 mb-2">2. Cursus universitaire</span>
              <div>Diplôme de Master : <strong>{formatData(profile.masterDegree)}</strong></div>
              <div>Établissement : <strong>{formatData(profile.masterUniversity)}</strong></div>
              <div>
                Moyenne & Mention : <strong className="font-mono-folder text-[#1E3A8A]">{formatData(profile.masterGrade)}</strong>{' '}
                ({formatData(profile.masterMention)})
              </div>
              <div>Mémoire de PFE : <strong>{formatData(profile.masterThesisTitle)}</strong></div>
              <div>Publications : <strong className="font-mono-folder">{profile.publicationsCount}</strong></div>
              <div>Niveau d'anglais : <strong>{formatData(profile.englishLevel)}</strong></div>
            </div>
          </div>

          {/* Sujet sélectionné */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-[13px] space-y-1">
            <span className="font-bold text-slate-900 block">3. Sujet de thèse sélectionné</span>
            <div className="font-semibold text-[#1E3A8A]">{selectedSubject.title}</div>
            <div className="text-slate-600">{selectedSubject.laboratory} · Directeur de thèse : {selectedSubject.director}</div>
          </div>

          {/* Liste complète des pièces */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-[13px] space-y-2">
            <span className="font-bold text-slate-900 block">4. Liste des pièces justificatives ({uploadedDocsCount} / {REQUIRED_DOCUMENTS.length})</span>
            <div className="divide-y divide-slate-200/80">
              {REQUIRED_DOCUMENTS.map((doc) => {
                const item = profile.documents[doc.key];
                return (
                  <div key={doc.key} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700">{doc.label}</span>
                    {item ? (
                      <span className="text-emerald-800 font-semibold flex items-center gap-1 text-[12px]">
                        <Check className="w-3.5 h-3.5" />
                        {item.name} ({item.size})
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium text-[12px]">Non joint</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Avertissement caractère définitif */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Envoi définitif :</strong> Après soumission, votre dossier sera <strong>verrouillé</strong> et transmis à l'administration pour contrôle. Seules vos coordonnées de contact resteront modifiables (ainsi que les pièces complémentaires en cas de demande de correction).
            </div>
          </div>

          {/* Checkbox Déclaration sur l'honneur */}
          <label className="flex items-start gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[13px] text-emerald-950 cursor-pointer">
            <input
              type="checkbox"
              checked={isHonorDeclared}
              onChange={(e) => setIsHonorDeclared(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              <strong>Déclaration sur l'honneur :</strong> Je certifie l'exactitude des informations renseignées et l'authenticité des pièces jointes, et je comprends que l'envoi de ma candidature est définitif.
            </span>
          </label>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-slate-900 truncate">{previewDoc.label}</h3>
                <p className="text-[12px] text-slate-500">{previewDoc.item.name} · {previewDoc.item.size}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 rounded-lg border border-slate-200 min-h-[280px] max-h-[65vh] overflow-auto flex items-center justify-center p-4">
              {previewDoc.item.previewUrl && previewDoc.item.mimeType?.startsWith('image/') ? (
                <img
                  src={previewDoc.item.previewUrl}
                  alt={previewDoc.item.name}
                  className="max-w-full max-h-[58vh] object-contain rounded"
                />
              ) : previewDoc.item.previewUrl && previewDoc.item.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.item.previewUrl}
                  title={previewDoc.item.name}
                  className="w-full h-[55vh] rounded border-0 bg-white"
                />
              ) : (
                <div className="text-center space-y-2 text-slate-600">
                  <FileText className="w-10 h-10 text-[#1E3A8A] mx-auto" />
                  <div className="font-semibold text-slate-900">{previewDoc.item.name}</div>
                  <div className="text-xs text-slate-500">Taille : {previewDoc.item.size}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-[13px] font-semibold bg-[#1E3A8A] text-white rounded-lg cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fixed Bottom Bar with "Retour" / "Continuer" & Auto-Save */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xs border-t border-slate-200 py-3 px-4 sm:px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Enregistré automatiquement à {lastSavedTime}</span>
            <span className="sm:hidden">{lastSavedTime}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-[14px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2 text-[14px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5 shadow-2xs"
              >
                <span>Continuer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!isHonorDeclared || alreadyApplied}
                onClick={() => onApplicationSubmitted(profile)}
                title={!isHonorDeclared ? 'Cochez la déclaration sur l\'honneur pour déposer votre candidature' : undefined}
                className={`px-6 py-2 text-[14px] font-semibold rounded-lg transition-colors min-h-[44px] flex items-center gap-1.5 shadow-2xs ${
                  !isHonorDeclared || alreadyApplied
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'text-white bg-emerald-700 hover:bg-emerald-800 cursor-pointer'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Déposer ma candidature</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
