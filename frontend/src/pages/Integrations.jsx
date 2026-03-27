/**
 * Integrations - Página unificada de todas las integraciones
 * 
 * Incluye Google, WhatsApp, Slack y 20+ servicios más
 */

import { useEffect, useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WorkspaceContext } from '../context/WorkspaceContext';
import GoogleIntegrationCard from '../components/integrations/GoogleIntegrationCard';
import TelegramBotManager from '../components/integrations/TelegramBotManager';
import { useGoogleIntegration } from '../hooks/useGoogleIntegration';
import WidgetIntegrationCard from '../components/integrations/WidgetIntegrationCard';
import MetaIntegrationCard from '../components/integrations/MetaIntegrationCard';
import { Toast } from '../components/Toast';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  SparklesIcon,
  BoltIcon,
  GlobeAltIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  MegaphoneIcon,
  ShoppingBagIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import api from '../api/client';

// ══════════════════════════════════════════════════════════════════════════════
// ── Professional SVG Icons (Brand Logos) ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const HubSpotIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978 2.2 2.2 0 00-4.398 0c0 .899.543 1.67 1.319 2.012v2.836a5.395 5.395 0 00-2.212 1.186l-5.89-4.52a2.33 2.33 0 00.076-.557 2.346 2.346 0 00-4.691 0 2.346 2.346 0 002.345 2.346c.467 0 .9-.143 1.267-.38l5.736 4.4a5.445 5.445 0 00-.184 1.384 5.426 5.426 0 00.186 1.396l-5.729 4.392a2.333 2.333 0 00-1.276-.39 2.346 2.346 0 100 4.692c1.295 0 2.345-1.05 2.345-2.346 0-.207-.028-.407-.078-.598L14 14.84a5.428 5.428 0 002.219 1.178v2.854a2.199 2.199 0 00-1.267 1.978 2.2 2.2 0 104.397 0c0-.896-.54-1.665-1.312-2.007v-2.826a5.4 5.4 0 003.376-5.003 5.4 5.4 0 00-3.249-4.94z"/>
  </svg>
);

const PipedriveIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4a8 8 0 110 16 8 8 0 010-16zm0 2a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z"/>
  </svg>
);

const CalendlyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.655 14.262c.281-.223.587-.463.9-.686.24-.166.264-.449.149-.711-.329-.727-.81-1.38-1.371-1.941-.562-.562-1.215-1.043-1.941-1.372-.263-.115-.546-.091-.711.149-.223.313-.463.619-.686.9-.58.727-1.38 1.148-2.25 1.148-.869 0-1.67-.421-2.249-1.148-.223-.281-.463-.587-.686-.9-.165-.24-.448-.264-.711-.149-.727.329-1.38.81-1.941 1.372-.562.561-1.043 1.214-1.372 1.941-.115.262-.091.545.149.711.313.223.619.463.9.686.728.579 1.149 1.38 1.149 2.249s-.421 1.67-1.149 2.25c-.281.223-.587.463-.9.686-.24.166-.264.448-.149.711.329.727.81 1.38 1.372 1.941.561.562 1.214 1.043 1.941 1.372.263.115.546.091.711-.149.223-.313.463-.619.686-.9.579-.728 1.38-1.149 2.249-1.149.87 0 1.67.421 2.25 1.149.223.281.463.587.686.9.166.24.448.264.711.149.727-.329 1.379-.81 1.941-1.372.562-.561 1.042-1.214 1.371-1.941.116-.263.091-.545-.149-.711-.313-.223-.619-.463-.9-.686-.727-.58-1.148-1.381-1.148-2.25s.421-1.67 1.148-2.249z"/>
  </svg>
);

const GoogleCalendarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zm12.632-18.316V0H5.684v5.684h12.632zM0 18.316h5.684V5.684H0v12.632zm0 5.684h5.684V18.316H0V24z" fillOpacity=".1"/>
    <path d="M18.316 18.316H24v5.684h-5.684v-5.684zm0-12.632H24V0h-5.684v5.684z" fillOpacity=".2"/>
  </svg>
);

const NotionIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.023c-.42-.326-.98-.7-2.055-.607L3.01 2.546c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.455-.234 4.763 7.28V9.06l-1.214-.14c-.094-.513.28-.886.747-.933zm-12.11-4.39l13.215-.793c.747-.14.934 0 1.354.327l3.968 2.73c.84.606.42 1.26-.7 1.26l-14.476.84c-1.12.093-1.495-.28-2.055-.793L2. 5.26c-.56-.42-.373-.934.887-1.027z"/>
  </svg>
);

const GoogleSheetsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.385 3.077H4.615A1.538 1.538 0 003.077 4.615v14.77a1.538 1.538 0 001.538 1.538h14.77a1.538 1.538 0 001.538-1.538V4.615a1.538 1.538 0 00-1.538-1.538zM9.23 18.462H5.539v-3.693H9.23v3.693zm0-4.616H5.539v-3.692H9.23v3.692zm0-4.615H5.539V5.538H9.23v3.693zm9.231 9.231h-8.307v-3.693h8.307v3.693zm0-4.616h-8.307v-3.692h8.307v3.692zm0-4.615h-8.307V5.538h8.307v3.693z"/>
  </svg>
);

const AirtableIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.992 0L1.608 4.281v15.344L12.006 24l10.386-4.281V4.375L11.992 0zm7.744 6.844l-7.738 3.188-7.738-3.188 7.738-3.094 7.738 3.094zM3.328 8.188l7.953 3.281v9.188L3.328 17.47V8.188zm9.391 12.468v-9.187l7.953-3.281v9.281l-7.953 3.187z"/>
  </svg>
);

const SlackIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522v-2.52zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
  </svg>
);

const DiscordIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const StripeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
  </svg>
);

const PayPalIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-1.564 0-2.903 1.147-3.15 2.7l-.94 5.963-.29 1.84c-.084.523.323 1.023.85 1.023h4.607c.524 0 .968-.382 1.05-.9l.042-.115.83-5.24.053-.29c.082-.519.523-.9 1.048-.9h.658c4.284 0 7.638-1.74 8.62-6.77.41-2.095.2-3.846-.982-5.106z"/>
  </svg>
);

const MailchimpIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.26 8.158c-.097-.146-.264-.208-.47-.208-.254 0-.613.162-.85.366a2.343 2.343 0 00-.527.688c-.163-.48-.413-.787-.802-.993-.365-.194-.728-.262-1.1-.262-.467 0-.92.137-1.3.387a3.003 3.003 0 00-.942.978c-.017.025-.037.05-.054.076a2.27 2.27 0 00-.345-.43c-.338-.33-.804-.524-1.314-.524-.337 0-.657.082-.916.206-.17.082-.32.183-.446.31a2.016 2.016 0 00-.322-.276c-.36-.247-.788-.38-1.246-.38-.448 0-.857.158-1.16.413a1.99 1.99 0 00-.42.48c-.088-.11-.19-.21-.31-.296-.33-.236-.755-.36-1.234-.36-.46 0-.891.158-1.206.4-.22.167-.4.383-.525.613-.232.435-.29.918-.16 1.335.077.242.21.457.395.62-.047.122-.08.25-.097.38-.032.258.006.493.087.706.04.104.092.202.152.294-.146.203-.265.4-.352.59a2.15 2.15 0 00-.196.868c0 .306.072.597.204.852.157.3.388.53.63.698a1.83 1.83 0 00.65.285v.006c.033.65.367 1.23.888 1.638.523.41 1.25.658 2.092.68h.003c.64-.012 1.21-.14 1.712-.386.394-.193.743-.46 1.032-.804.033.05.067.1.104.15.17.225.38.406.63.54.12.064.246.118.377.16.158.05.324.087.497.108.217.026.423.035.613.028h.042a3.37 3.37 0 001.043-.204 2.643 2.643 0 001.115-.74c.37.334.914.547 1.506.547.59 0 1.13-.21 1.498-.542.366-.33.567-.785.567-1.26 0-.085-.008-.168-.023-.25.117.032.243.05.376.05.5 0 .946-.2 1.26-.52.314-.32.497-.758.497-1.233v-.003c0-.31-.076-.6-.207-.855a2.215 2.215 0 00.574-.688c.193-.342.305-.734.305-1.15 0-.446-.137-.87-.398-1.21z"/>
  </svg>
);

const SendGridIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 8v8h8v8h8V8H0zm8 8H4v-4h4v4zm8 4h-4v-4h4v4zm0-8h-4V8h4v4zM8 0v4H4v4H0V0h8z"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const ShopifyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.756c-.022-.142-.153-.236-.295-.236s-1.47-.107-1.47-.107-.96-.948-1.096-1.076c-.067-.064-.148-.09-.229-.102l-.972 22.838zm-2.6-19.706l-.436 1.378s-.47-.232-1.077-.232c-.858 0-.894.538-.894.674 0 .744.952 1.02 1.943 2.125.91 1.016.988 1.986.988 2.554 0 2.234-1.725 3.675-4.155 3.675-1.68 0-2.485-.823-2.485-.823l.522-1.64s.87.753 1.63.753c.762 0 1.263-.59 1.263-1.24 0-.89-.886-1.305-1.718-2.107-.856-.824-1.074-1.548-1.074-2.5 0-1.822 1.35-3.622 4.023-3.622.986 0 1.47.285 1.47.285z"/>
  </svg>
);

const WooCommerceIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.227 4.857A2.228 2.228 0 000 7.094v7.457a2.228 2.228 0 002.227 2.238h8.069l3.96 2.771-.933-2.771h8.45A2.228 2.228 0 0024 14.55V7.094a2.229 2.229 0 00-2.227-2.238H2.227zm1.04 1.905c.287.032.563.153.75.406.192.249.269.67.269 1.204l.004 4.063c0 .596-.119 1.076-.357 1.423-.244.355-.56.53-.942.53-.347 0-.642-.135-.882-.404-.247-.27-.411-.71-.504-1.31l-.583-3.264-.88 4.608a.46.46 0 01-.065.151.33.33 0 01-.273.143.346.346 0 01-.317-.196L.002 7.988l.002-1.105c.008-.04.017-.058.03-.082a.3.3 0 01.261-.151c.193 0 .322.1.385.298l.536 1.796.686-1.995a.346.346 0 01.149-.216.38.38 0 01.202-.055.351.351 0 01.345.284l.67 3.758.358-3.312c.027-.263.1-.472.22-.625a.506.506 0 01.42-.197zm5.846 0c.55 0 1.016.197 1.396.59.381.4.67.97.862 1.705.149.57.224 1.213.224 1.924 0 .963-.172 1.79-.516 2.475-.382.76-.901 1.14-1.557 1.14-.524 0-.966-.199-1.322-.596a4.236 4.236 0 01-.832-1.657 7.327 7.327 0 01-.26-1.998c0-.855.133-1.63.4-2.317.321-.827.806-1.24 1.458-1.266h.147zm9.012 0c.55 0 1.016.197 1.396.59.382.4.67.97.862 1.705.15.57.224 1.213.224 1.924 0 .963-.172 1.79-.515 2.475-.383.76-.902 1.14-1.558 1.14-.524 0-.966-.199-1.322-.596a4.236 4.236 0 01-.832-1.657 7.327 7.327 0 01-.26-1.998c0-.855.133-1.63.4-2.317.322-.827.806-1.24 1.458-1.266h.147zM9.13 8.047c-.218 0-.414.194-.577.582-.195.477-.293 1.136-.293 1.974 0 .641.066 1.21.2 1.705.154.57.357.855.608.855.233 0 .437-.22.612-.662a5.34 5.34 0 00.328-1.955 5.8 5.8 0 00-.211-1.605c-.166-.596-.391-.894-.667-.894zm9.013 0c-.219 0-.414.194-.578.582-.194.477-.292 1.136-.292 1.974 0 .641.066 1.21.2 1.705.153.57.356.855.607.855.234 0 .438-.22.612-.662a5.331 5.331 0 00.329-1.955 5.8 5.8 0 00-.212-1.605c-.165-.596-.39-.894-.666-.894z"/>
  </svg>
);

const ZapierIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.633 1.927l-3.186 6.559-3.187-6.56A11.91 11.91 0 0012 1.72c.91 0 1.8.073 2.667.207h-.034zm-7.49.9L11.67 12l-7.073 3.527A11.905 11.905 0 012.47 12c0-3.573 1.565-6.783 4.049-8.981l1.625 1.807-.001.001zM12 22.28c-.911 0-1.8-.072-2.667-.206l3.187-6.56 3.187 6.559A11.991 11.991 0 0112 22.28zM21.53 12c0 3.572-1.565 6.783-4.049 8.98l-3.527-9.17 7.073-3.528c.317.95.503 1.965.503 3.718zm-9.427-4.31l-3.64-3.64 3.64-.75.75-3.64 3.64 3.64-.75 3.64 3.64.75-.75 3.64-3.64-3.64.75-3.64zm8.934-3.116l-3.528 7.073-9.17-3.527 7.073-3.528A11.905 11.905 0 0121.037 4.574z"/>
  </svg>
);

const MakeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2a10 10 0 110 20 10 10 0 010-20zm-2 6v8l6-4-6-4z"/>
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Mapeo de iconos SVG por ID ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const INTEGRATION_ICONS = {
  hubspot: HubSpotIcon,
  pipedrive: PipedriveIcon,
  calendly: CalendlyIcon,
  googleCalendar: GoogleCalendarIcon,
  notion: NotionIcon,
  googleSheets: GoogleSheetsIcon,
  airtable: AirtableIcon,
  slack: SlackIcon,
  discord: DiscordIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  stripe: StripeIcon,
  paypal: PayPalIcon,
  mailchimp: MailchimpIcon,
  sendgrid: SendGridIcon,
  twitter: XIcon,
  instagram: InstagramIcon,
  shopify: ShopifyIcon,
  woocommerce: WooCommerceIcon,
  zapier: ZapierIcon,
  make: MakeIcon,
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Catálogo de integraciones ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const ALL_INTEGRATIONS = [
  // CRM & Ventas
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', brandColor: '#FF7A59', gradient: 'from-orange-500 to-red-500', description: 'Sincroniza contactos y leads con HubSpot CRM', actions: 4, triggers: 2 },
  { id: 'pipedrive', name: 'Pipedrive', category: 'CRM', brandColor: '#25D366', gradient: 'from-green-500 to-emerald-600', description: 'Gestiona deals y contactos en Pipedrive', actions: 3, triggers: 3 },
  
  // Calendario & Citas
  { id: 'calendly', name: 'Calendly', category: 'Calendario', brandColor: '#006BFF', gradient: 'from-blue-500 to-blue-600', description: 'Agenda citas automáticamente con Calendly', actions: 3, triggers: 2 },
  { id: 'googleCalendar', name: 'Google Calendar', category: 'Calendario', brandColor: '#4285F4', gradient: 'from-blue-400 to-blue-600', description: 'Crea eventos y gestiona tu calendario', actions: 4, triggers: 2, native: true },
  
  // Productividad
  { id: 'notion', name: 'Notion', category: 'Productividad', brandColor: '#000000', gradient: 'from-slate-700 to-slate-900', description: 'Crea páginas y bases de datos en Notion', actions: 3, triggers: 2 },
  { id: 'googleSheets', name: 'Google Sheets', category: 'Productividad', brandColor: '#34A853', gradient: 'from-green-500 to-green-600', description: 'Lee y escribe datos en hojas de cálculo', actions: 4, triggers: 1, native: true },
  { id: 'airtable', name: 'Airtable', category: 'Productividad', brandColor: '#18BFFF', gradient: 'from-cyan-400 to-blue-500', description: 'Gestiona bases de datos en Airtable', actions: 4, triggers: 2 },
  
  // Comunicación
  { id: 'slack', name: 'Slack', category: 'Comunicación', brandColor: '#4A154B', gradient: 'from-purple-800 to-purple-900', description: 'Envía mensajes y notificaciones a Slack', actions: 3, triggers: 2 },
  { id: 'discord', name: 'Discord', category: 'Comunicación', brandColor: '#5865F2', gradient: 'from-indigo-500 to-indigo-600', description: 'Envía mensajes a canales de Discord', actions: 2, triggers: 0 },
  { id: 'telegram', name: 'Telegram Bot', category: 'Comunicación', brandColor: '#0088CC', gradient: 'from-sky-500 to-blue-600', description: 'Integra un bot de Telegram', actions: 3, triggers: 2 },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Comunicación', brandColor: '#25D366', gradient: 'from-green-500 to-green-600', description: 'Envía y recibe mensajes por WhatsApp', actions: 3, triggers: 2, comingSoon: true },
  
  // Pagos
  { id: 'stripe', name: 'Stripe', category: 'Pagos', brandColor: '#635BFF', gradient: 'from-violet-500 to-indigo-600', description: 'Procesa pagos con Stripe', actions: 4, triggers: 3 },
  { id: 'paypal', name: 'PayPal', category: 'Pagos', brandColor: '#003087', gradient: 'from-blue-700 to-blue-900', description: 'Recibe pagos con PayPal', actions: 3, triggers: 2 },
  
  // Email Marketing
  { id: 'mailchimp', name: 'Mailchimp', category: 'Marketing', brandColor: '#FFE01B', gradient: 'from-yellow-400 to-amber-500', description: 'Gestiona listas y campañas de email', actions: 4, triggers: 2 },
  { id: 'sendgrid', name: 'SendGrid', category: 'Marketing', brandColor: '#1A82E2', gradient: 'from-blue-500 to-cyan-600', description: 'Envía emails transaccionales', actions: 3, triggers: 3 },
  
  // Social Media
  { id: 'twitter', name: 'X (Twitter)', category: 'Social', brandColor: '#000000', gradient: 'from-slate-800 to-black', description: 'Publica tweets y monitorea menciones', actions: 3, triggers: 2 },
  { id: 'instagram', name: 'Instagram', category: 'Social', brandColor: '#E4405F', gradient: 'from-pink-500 via-red-500 to-yellow-500', description: 'Gestiona mensajes de Instagram', actions: 3, triggers: 2 },
  
  // Ecommerce
  { id: 'shopify', name: 'Shopify', category: 'E-commerce', brandColor: '#96BF48', gradient: 'from-green-500 to-lime-500', description: 'Conecta tu tienda Shopify', actions: 4, triggers: 3 },
  { id: 'woocommerce', name: 'WooCommerce', category: 'E-commerce', brandColor: '#96588A', gradient: 'from-purple-600 to-pink-600', description: 'Integra tu tienda WooCommerce', actions: 4, triggers: 2 },
  
  // Automatización
  { id: 'zapier', name: 'Zapier', category: 'Automatización', brandColor: '#FF4A00', gradient: 'from-orange-500 to-orange-600', description: 'Conecta con miles de apps via Zapier', actions: 1, triggers: 1 },
  { id: 'make', name: 'Make', category: 'Automatización', brandColor: '#6D00CC', gradient: 'from-purple-600 to-violet-700', description: 'Conecta con Make scenarios', actions: 1, triggers: 1 },
];

// ══════════════════════════════════════════════════════════════════════════════
// ── Componente IntegrationLogo ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function IntegrationLogo({ integration, size = 'md', showGlow = false }) {
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14'
  };
  
  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  };
  
  const IconComponent = INTEGRATION_ICONS[integration.id];
  const lightBgColors = ['#FFE01B', '#96BF48'];
  const iconColor = lightBgColors.includes(integration.brandColor) ? 'text-slate-800' : 'text-white';
  
  return (
    <div className="relative">
      {showGlow && (
        <div 
          className="absolute inset-0 rounded-xl blur-xl opacity-40"
          style={{ backgroundColor: integration.brandColor }}
        />
      )}
      <div 
        className={`relative ${sizeClasses[size]} rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br ${integration.gradient || ''}`}
        style={!integration.gradient ? { backgroundColor: integration.brandColor } : {}}
      >
        {IconComponent ? (
          <IconComponent className={`${iconSizeClasses[size]} ${iconColor}`} />
        ) : (
          <span className={`font-bold ${iconColor} text-sm`}>
            {integration.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Categorías con iconos ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  { id: 'Todos', label: 'Todos', Icon: GlobeAltIcon, color: 'violet' },
  { id: 'CRM', label: 'CRM', Icon: SparklesIcon, color: 'orange' },
  { id: 'Calendario', label: 'Calendario', Icon: CalendarDaysIcon, color: 'blue' },
  { id: 'Productividad', label: 'Productividad', Icon: TableCellsIcon, color: 'emerald' },
  { id: 'Comunicación', label: 'Comunicación', Icon: ChatBubbleLeftRightIcon, color: 'sky' },
  { id: 'Pagos', label: 'Pagos', Icon: CreditCardIcon, color: 'purple' },
  { id: 'Marketing', label: 'Marketing', Icon: MegaphoneIcon, color: 'pink' },
  { id: 'Social', label: 'Social', Icon: GlobeAltIcon, color: 'rose' },
  { id: 'E-commerce', label: 'E-commerce', Icon: ShoppingBagIcon, color: 'amber' },
  { id: 'Automatización', label: 'Automación', Icon: ArrowsRightLeftIcon, color: 'indigo' },
];

export default function Integrations() {
  const { workspaceId } = useContext(WorkspaceContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [connectModal, setConnectModal] = useState(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [telegramToken, setTelegramToken] = useState('');
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [managingIntegration, setManagingIntegration] = useState(null); // 'telegram', etc.
  
  // Hook de Google
  const { status: googleStatus } = useGoogleIntegration();

  // Detectar parámetros de callback de OAuth
  useEffect(() => {
    const googleParam = searchParams.get('google');
    const error = searchParams.get('error');

    if (googleParam === 'connected') {
      setToast({ type: 'success', message: '¡Google conectado exitosamente!' });
      searchParams.delete('google');
      setSearchParams(searchParams);
    } else if (error) {
      setToast({ type: 'error', message: `Error: ${decodeURIComponent(error)}` });
      searchParams.delete('error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Cargar integraciones conectadas
  useEffect(() => {
    if (workspaceId) {
      loadConnectedIntegrations();
    }
  }, [workspaceId]);

  const loadConnectedIntegrations = async () => {
    try {
      const response = await api.get(`/integrations/${workspaceId}/connected`);
      if (response.data.success) {
        setConnectedIntegrations(response.data.integrations || []);
      }
    } catch (err) {
      console.error('Error loading connected integrations:', err);
    }
  };

  // Filtrar integraciones (excluir las nativas de Google, ya se muestran arriba)
  const filteredIntegrations = ALL_INTEGRATIONS.filter(i => {
    // Excluir Google Calendar y Sheets ya que se gestionan desde la tarjeta principal
    if (i.native) return false;
    
    const matchesSearch = !search || 
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || i.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Verificar si está conectada (incluye Google)
  const isConnected = (id) => {
    // Las integraciones de Google se verifican via el hook
    if (id === 'googleCalendar' || id === 'googleSheets') {
      return googleStatus.connected;
    }
    return connectedIntegrations.some(c => c.integrationId === id);
  };
  
  // Contar integraciones conectadas (backend + Google si está conectada)
  const totalConnected = connectedIntegrations.length + (googleStatus.connected ? 1 : 0);

  // Conectar integración
  const handleConnect = async (integration) => {
    if (integration.comingSoon) {
      setToast({ type: 'info', message: `${integration.name} estará disponible próximamente` });
      return;
    }
    
    if (integration.native) {
      // Las integraciones nativas (Google) se manejan con OAuth
      setToast({ type: 'info', message: 'Usa la tarjeta de Google arriba para conectar' });
      return;
    }
    
    // Abrir modal de conexión específico según la integración
    setConnectModal(integration);
  };
  
  // Conectar bot de Telegram
  const handleConnectTelegram = async () => {
    if (!telegramToken.trim()) {
      setToast({ type: 'error', message: 'Ingresa el token del bot' });
      return;
    }
    
    setConnectingTelegram(true);
    try {
      const res = await api.post(`/integrations/${workspaceId}/telegram/connect`, {
        token: telegramToken.trim()
      });
      
      if (res.data.success) {
        setToast({ type: 'success', message: '¡Bot de Telegram conectado!' });
        setConnectModal(null);
        setTelegramToken('');
        loadConnectedIntegrations();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Error al conectar Telegram' });
    } finally {
      setConnectingTelegram(false);
    }
  };

  // Si está gestionando una integración específica, mostrar esa vista
  if (managingIntegration === 'telegram') {
    return (
      <div className="min-h-full p-6" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
        <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setManagingIntegration(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver a Integraciones
        </button>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Configurar Telegram Bot</h1>
          <p className="text-slate-400">
            Configura tu bot de Telegram para recibir y enviar mensajes
          </p>
        </div>
        
        <TelegramBotManager workspaceId={workspaceId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
      <div className="max-w-7xl mx-auto">
      
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <LinkIcon className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Centro de Integraciones</h1>
              <p className="text-slate-400 text-sm">
                Conecta tu workspace con +20 servicios externos
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-emerald-400 font-bold text-lg">{totalConnected}</span>
                <span className="text-slate-400 ml-1.5 text-sm">activas</span>
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
              <BoltIcon className="w-5 h-5 text-violet-400" />
              <div>
                <span className="text-violet-400 font-bold text-lg">{ALL_INTEGRATIONS.filter(i => !i.native).length}</span>
                <span className="text-slate-400 ml-1.5 text-sm">disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PLATAFORMAS PRINCIPALES - Google & Meta */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
          <h2 className="text-lg font-semibold text-white">Plataformas Principales</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 ml-2">
            Recomendadas
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Google Card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08), rgba(52, 168, 83, 0.04))', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
            <GoogleIntegrationCard />
          </div>
          
          {/* Meta Card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0, 136, 255, 0.08), rgba(255, 0, 128, 0.04))', border: '1px solid rgba(0, 136, 255, 0.2)' }}>
            <MetaIntegrationCard />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* WIDGET WEB */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
          <h2 className="text-lg font-semibold text-white">Widget de Chat</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 ml-2">
            Tu sitio web
          </span>
        </div>
        
        <WidgetIntegrationCard />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FILTROS Y BÚSQUEDA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <div className="p-4 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, categoría o descripción..."
                className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 transition-all text-sm"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                >
                  <XMarkIcon className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            
            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap items-center">
              {CATEGORIES.map((cat) => {
                const Icon = cat.Icon;
                const isSelected = selectedCategory === cat.id;
                const colorClasses = {
                  violet: 'bg-violet-600 shadow-violet-500/30 border-violet-500',
                  orange: 'bg-orange-500 shadow-orange-500/30 border-orange-400',
                  blue: 'bg-blue-500 shadow-blue-500/30 border-blue-400',
                  emerald: 'bg-emerald-500 shadow-emerald-500/30 border-emerald-400',
                  sky: 'bg-sky-500 shadow-sky-500/30 border-sky-400',
                  pink: 'bg-pink-500 shadow-pink-500/30 border-pink-400',
                  rose: 'bg-rose-500 shadow-rose-500/30 border-rose-400',
                  amber: 'bg-amber-500 shadow-amber-500/30 border-amber-400',
                  purple: 'bg-purple-500 shadow-purple-500/30 border-purple-400',
                  indigo: 'bg-indigo-500 shadow-indigo-500/30 border-indigo-400',
                };
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${colorClasses[cat.color]} text-white shadow-lg border`
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    style={!isSelected ? { border: '1px solid rgba(255, 255, 255, 0.08)' } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GRID DE INTEGRACIONES */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-slate-400 to-slate-600" />
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {(() => {
                const cat = CATEGORIES.find(c => c.id === selectedCategory);
                const Icon = cat?.Icon;
                return (
                  <>
                    {Icon && <Icon className="w-5 h-5 text-slate-400" />}
                    {selectedCategory === 'Todos' ? 'Todas las Integraciones' : cat?.label || selectedCategory}
                  </>
                );
              })()}
            </h2>
          </div>
          <span className="text-sm text-slate-500">
            {filteredIntegrations.length} {filteredIntegrations.length === 1 ? 'integración' : 'integraciones'}
          </span>
        </div>
        
        {filteredIntegrations.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <MagnifyingGlassIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No se encontraron integraciones</p>
            <p className="text-slate-500 text-sm">Intenta con otro término de búsqueda o categoría</p>
            <button 
              onClick={() => { setSearch(''); setSelectedCategory('Todos'); }}
              className="mt-4 px-4 py-2 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIntegrations.map((integration) => {
              const connected = isConnected(integration.id);
              const comingSoon = integration.comingSoon;
              const canManage = connected && integration.id === 'telegram';
            
            return (
              <div
                key={integration.id}
                className={`p-4 rounded-xl transition-all group cursor-pointer ${comingSoon ? 'opacity-60' : ''}`}
                style={{
                  background: connected 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.04))' 
                    : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: connected 
                    ? '1px solid rgba(16, 185, 129, 0.3)' 
                    : '1px solid rgba(255,255,255,0.08)'
                }}
                onClick={() => {
                  if (canManage) {
                    setManagingIntegration('telegram');
                  } else if (!connected) {
                    handleConnect(integration);
                  }
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <IntegrationLogo integration={integration} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold truncate ${connected ? 'text-emerald-400' : 'text-white'}`}>
                        {integration.name}
                      </h3>
                      {connected && <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-xs text-slate-500">{integration.category}</span>
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                  {integration.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>{integration.actions} acciones</span>
                    {integration.triggers > 0 && <span>{integration.triggers} triggers</span>}
                  </div>
                  
                  {comingSoon ? (
                    <span className="px-2 py-1 rounded-md text-xs font-medium text-slate-500" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      Próximamente
                    </span>
                  ) : connected ? (
                    canManage ? (
                      <button className="px-2 py-1 rounded-md text-xs font-medium bg-violet-500/20 text-violet-400 flex items-center gap-1">
                        <Cog6ToothIcon className="w-3 h-3" />
                        Gestionar
                      </button>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Conectada
                      </span>
                    )
                  ) : (
                    <button className="px-2 py-1 rounded-md text-xs font-medium bg-violet-500/20 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <PlusIcon className="w-3 h-3" />
                      Conectar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Info adicional */}
      <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.04))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <h4 className="text-sm font-semibold text-violet-400 mb-2 flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          ¿Cómo usar las integraciones?
        </h4>
        <p className="text-sm text-zinc-300">
          Una vez conectado un servicio, podrás usarlo en tus flujos de automatización. 
          Por ejemplo, crear un evento en Google Calendar cuando se registre una nueva reserva, 
          enviar notificaciones a Slack, o exportar datos a Google Sheets automáticamente.
        </p>
      </div>

      {/* Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: 'linear-gradient(135deg, #12121a, #0d0d14)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IntegrationLogo integration={connectModal} size="lg" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Conectar {connectModal.name}
                    </h3>
                    <p className="text-sm text-slate-400">{connectModal.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setConnectModal(null); setTelegramToken(''); }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-slate-300 mb-4">{connectModal.description}</p>
              
              {/* Formulario específico para Telegram */}
              {connectModal.id === 'telegram' ? (
                <>
                  <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <p className="text-sm text-blue-200/90 mb-2">
                      <strong>¿Cómo obtener el token?</strong>
                    </p>
                    <ol className="text-sm text-blue-200/80 list-decimal list-inside space-y-1">
                      <li>Abre Telegram y busca @BotFather</li>
                      <li>Envía el comando /newbot</li>
                      <li>Sigue las instrucciones para crear tu bot</li>
                      <li>Copia el token que te proporciona</li>
                    </ol>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Token del Bot
                    </label>
                    <input
                      type="text"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="w-full px-4 py-2.5 rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setConnectModal(null); setTelegramToken(''); }}
                      className="flex-1 py-2.5 px-4 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConnectTelegram}
                      disabled={connectingTelegram || !telegramToken.trim()}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium disabled:opacity-50"
                    >
                      {connectingTelegram ? 'Conectando...' : 'Conectar Bot'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-lg mb-4 flex items-start gap-3" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90">
                      Esta integración requiere configuración adicional. 
                      Necesitarás proporcionar las credenciales de API.
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConnectModal(null)}
                      className="flex-1 py-2.5 px-4 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setToast({ type: 'info', message: 'Configuración de API próximamente disponible' });
                        setConnectModal(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium"
                    >
                      Próximamente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </div>
  );
}
