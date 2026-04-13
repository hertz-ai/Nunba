/**
 * Single source of truth for API base URLs and endpoint paths.
 * All services should import from here instead of hardcoding URLs.
 */

// ── Base URLs (override via REACT_APP_* env vars) ──
// Nunba desktop: API is always localhost:5000 (Flask serves everything)
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
export const SOCIAL_API_URL =
  process.env.REACT_APP_SOCIAL_API_URL || `${API_BASE_URL}/api/social`;
export const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL || API_BASE_URL;
export const CLOUD_API_URL =
  process.env.REACT_APP_CLOUD_API_URL || 'https://azurekong.hertzai.com';
export const ADMIN_API_URL = `${API_BASE_URL}/api/admin`;
export const TTS_API_URL = `${API_BASE_URL}/tts`;
export const KIDS_API_URL = `${SOCIAL_API_URL}/kids-learning`;
export const KIDS_MEDIA_URL = `${SOCIAL_API_URL}/kids-media`;
export const KIDS_TTS_URL = `${SOCIAL_API_URL}/tts`;
export const KIDS_MUSIC_URL = `${SOCIAL_API_URL}/music`;
export const MAILER_BASE_URL =
  process.env.REACT_APP_MAILER_API_URL || 'https://mailer.hertzai.com';
export const SMS_BASE_URL =
  process.env.REACT_APP_SMS_API_URL || 'https://sms.hertzai.com';

// ── App config ──
export const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN || '';
export const APP_VERSION = '1.0.0';
export const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID || '';
export const ENCRYPTION_KEY = process.env.REACT_APP_SECRET_KEY || '';

// ── OTP / Auth (Mailer) ──
export const OTP_SEND_URL = `${MAILER_BASE_URL}/send_otp`;
export const OTP_VALIDATE_URL = `${MAILER_BASE_URL}/validate_otp`;
export const OTP_VERIFY_URL = `${MAILER_BASE_URL}/varify_otp`;
export const RENEW_TOKEN_URL = `${MAILER_BASE_URL}/refresh_tokens`;

// ── Auth (Azure/Cloud) ──
export const AZURE_LOGIN_URL = `${CLOUD_API_URL}/data/login`;
export const AZURE_OTP_VERIFY_URL = `${CLOUD_API_URL}/data/varify_otp`;

// ── Teacher/Admin Auth (Mailer) ──
export const VERIFY_TEACHER_URL = `${MAILER_BASE_URL}/verifyTeacher`;
export const VERIFY_TEACHER_PHONE_URL = `${MAILER_BASE_URL}/verifyTeacherByPhone`;
export const REGISTER_TEACHER_URL = `${MAILER_BASE_URL}/register_teacher`;
export const ALL_CLIENTS_URL = `${MAILER_BASE_URL}/allclients`;
export const CREATE_CLIENT_URL = `${MAILER_BASE_URL}/createclient`;
export const DELETE_USER_URL = `${MAILER_BASE_URL}/delete_user_by_email_or_phone_num`;
export const CONFIRM_DELETE_USER_URL = `${MAILER_BASE_URL}/confirm_delete_user_by_email_or_phone_num`;

// ── Registration (Mailer) ──
export const REGISTER_STUDENT_URL = `${MAILER_BASE_URL}/register_student`;
export const REGISTER_CLIENT_URL = `${MAILER_BASE_URL}/createclient`;

// ── Courses/Content (Mailer) ──
export const UNIQUE_SUBJECT_URL = `${MAILER_BASE_URL}/getuniquesubject`;
export const GET_STANDARD_URL = `${MAILER_BASE_URL}/getstandard`;
export const GET_BOARD_URL = `${MAILER_BASE_URL}/getboard`;
export const UNIQUE_FILES_URL = `${MAILER_BASE_URL}/getuniquefiles`;
export const UNIQUE_COURSE_URL = `${MAILER_BASE_URL}/getuniquecourse`;
export const GET_BOOKS_URL = `${MAILER_BASE_URL}/getbooks`;
export const GET_BATCH_URL = `${MAILER_BASE_URL}/getbatch`;
export const CREATE_COURSE_URL = `${MAILER_BASE_URL}/create_course`;
export const CREATE_BOOK_SUBJECT_URL = `${MAILER_BASE_URL}/createbooksubject`;
export const GET_BOOKS_BY_COURSE_URL = `${MAILER_BASE_URL}/getbooksbycourse?course_name=`;

// ── Subscriptions / Payments (Mailer) ──
export const GET_PLANS_URL = `${MAILER_BASE_URL}/getallplandetails`;
export const ADD_SUBSCRIPTION_URL = `${MAILER_BASE_URL}/addsubscription_by_phone`;
export const PAYMENT_URL = `${MAILER_BASE_URL}/makepayment`;
export const DEDUCT_CREDITS_URL = `${MAILER_BASE_URL}/deduct-credits`;
export const SUBSCRIPTION_DATA_URL = `${MAILER_BASE_URL}/allAPIs?skip=0&limit=100`;
export const PAYMENT_STATUS_URL = `${MAILER_BASE_URL}/checkpaymentstatus`;

// ── PhonePe Payment Gateway ──
export const PHONEPE_HOST_URL = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';
export const PHONEPE_MERCHANT_ID =
  process.env.REACT_APP_PHONEPE_MERCHANT_ID || '';
export const PHONEPE_SALT_INDEX =
  process.env.REACT_APP_PHONEPE_SALT_INDEX || '1';
export const PHONEPE_SALT_KEY = process.env.REACT_APP_PHONEPE_SALT_KEY || '';

// ── Chat / AI (Azure) ──
export const CHATBOT_API_URL = `${CLOUD_API_URL}/chatbot/revision`;
export const CUSTOM_GPT_URL = `${CLOUD_API_URL}/chat/custom_gpt`;
export const PERSONALISED_LEARNING_URL = `${CLOUD_API_URL}/chat/teachme2`;
export const QUES_ANS_URL = `${CLOUD_API_URL}/qgen/quesAns2`;
export const QUES_ANS3_URL = `${CLOUD_API_URL}/qgen/quesAns4`;

// ── File Upload (local first, cloud fallback) ──
export const UPLOAD_IMAGE_URL = `${API_BASE_URL}/upload/image`;
export const UPLOAD_AUDIO_URL = `${API_BASE_URL}/upload/audio`;
export const UPLOAD_FILE_URL = `${API_BASE_URL}/upload/file`;
export const VISION_INFERENCE_URL = `${API_BASE_URL}/upload/vision`;
export const CREATE_PROMPT_URL = `${CLOUD_API_URL}/db/create_prompt`;
export const BOOK_PARSING_URL = `${API_BASE_URL}/upload/parse_pdf`;
export const BOOK_PARSING_STATUS_URL = `${API_BASE_URL}/upload/parse_pdf/status`;
export const BOOK_PARSING_CLOUD_URL = `${CLOUD_API_URL}/book_parsing/book_parsing_upload_api`;

// ── Assessments (Mailer) ──
export const GET_QA_URL = `${MAILER_BASE_URL}/get_all_QAs_by_assessment_name`;
export const ALL_ASSESSMENTS_URL = `${MAILER_BASE_URL}/allassessments`;
export const CREATE_PROMPT_LIST_URL = `${MAILER_BASE_URL}/createpromptlist`;
export const UPDATE_QA_URL = `${MAILER_BASE_URL}/updateQA/`;
export const DELETE_QA_URL = `${MAILER_BASE_URL}/deleteQA/`;

// ── Prompts (Mailer) ──
export const GET_PROMPTS_BY_USER_URL = `${MAILER_BASE_URL}/getprompt_onlyuserid/?user_id=`;
export const GET_FAMOUS_CHARACTER_URL = `${MAILER_BASE_URL}/get_famous_character`;

// ── Video / Media (Azure) ──
export const VIDEO_GEN_URL = `${CLOUD_API_URL}/db/video_gen`;

// ── Email (SMS service) ──
export const SEND_EMAIL_URL = `${SMS_BASE_URL}/sendEmailViaHertz`;

// ── WAMP / Crossbar ──
// Local/bundled mode: embedded WAMP router on port 8088 (started by main.py).
// Cloud/regional mode: Crossbar.io router at aws_rasa.hertzai.com.
export const WAMP_LOCAL_URL =
  process.env.REACT_APP_WAMP_URL || 'ws://localhost:8088/ws';
export const WAMP_CLOUD_URL = 'wss://aws_rasa.hertzai.com:8445/wss';

// ── Local API ──
export const LOCAL_API_URL = API_BASE_URL;
export const LOCAL_PROMPTS_URL = `${API_BASE_URL}/prompts`;
