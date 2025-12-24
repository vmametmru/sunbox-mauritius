import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Download, Mail, ThumbsUp, ThumbsDown, 
  Copy, CheckCircle, Home, Waves, Phone, MapPin, Calendar,
  FileText, Share2, Printer, Loader2
} from 'lucide-react';
import { useQuote } from '@/contexts/QuoteContext';
import { api } from '@/lib/api';
import ConstructionBanner from "@/components/ConstructionBanner";
import { useSiteSettings } from "@/hooks/use-site-settings";


const QuotePage: React.FC = () => {
  const navigate = useNavigate();
  const { generatedQuote, resetQuote } = useQuote();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'declined'>('pending');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const quoteRef = useRef<HTMLDivElement>(null);
  const { data: siteSettings } = useSiteSettings();
const underConstruction = siteSettings?.site_under_construction === "true";
const ucMessage =
  siteSettings?.under_construction_message ||
  "🚧 Page en construction — merci de revenir ultérieurement.";

  useEffect(() => {
    if (!generatedQuote) {
      navigate('/');
    }
  }, [generatedQuote, navigate]);

  if (!generatedQuote) {
    return null;
  }

  const quote = generatedQuote;
  const model = quote.model;

  const copyReferenceNumber = () => {
    navigator.clipboard.writeText(quote.referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = async () => {
    setStatus('approved');
    try {
      await api.query('update_quote_status', { 
        id: quote.id, 
        status: 'approved' 
      });
    } catch (err) {
      console.error('Failed to update quote status:', err);
    }
  };

  const handleDecline = async () => {
    setStatus('declined');
    try {
      await api.query('update_quote_status', { 
        id: quote.id, 
        status: 'rejected' 
      });
    } catch (err) {
      console.error('Failed to update quote status:', err);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      await api.sendTemplateEmail({
        to: quote.email,
        template_key: 'quote_confirmation',
        data: {
          customer_name: quote.customerName,
          reference: quote.referenceNumber,
          model_name: model.name,
          base_price: quote.basePrice.toLocaleString(),
          options_total: quote.optionsTotal.toLocaleString(),
          total_price: quote.totalPrice.toLocaleString(),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
        }
      });
      setEmailSent(true);
    } catch (err) {
      console.error('Failed to send email:', err);
    } finally {
      setIsSendingEmail(false);
    }
  };



  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const logoUrl = 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765987011270_65b53987.jpg';
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Devis ${quote.referenceNumber} - Sunbox Mauritius</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                padding: 30px; 
                max-width: 900px; 
                margin: 0 auto; 
                color: #333;
                line-height: 1.5;
              }
              .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                margin-bottom: 30px; 
                padding-bottom: 20px; 
                border-bottom: 3px solid #1A365D;
              }
              .logo-section { display: flex; align-items: center; gap: 15px; }
              .logo { width: 60px; height: 60px; border-radius: 10px; }
              .company-name { font-size: 28px; font-weight: bold; color: #1A365D; }
              .company-tagline { font-size: 12px; color: #666; }
              .quote-info { text-align: right; }
              .quote-ref { font-size: 14px; color: #666; margin-bottom: 5px; }
              .quote-ref strong { color: #1A365D; font-size: 16px; }
              .quote-date { font-size: 12px; color: #888; }
              
              .model-section { 
                background: linear-gradient(135deg, #1A365D 0%, #2D4A7C 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 25px;
              }
              .model-title { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
              .model-type { font-size: 14px; opacity: 0.8; }
              
              .images-section {
                display: flex;
                gap: 20px;
                margin-bottom: 25px;
              }
              .image-box {
                flex: 1;
                text-align: center;
              }
              .image-box img {
                width: 100%;
                max-height: 200px;
                object-fit: cover;
                border-radius: 10px;
                border: 2px solid #e5e7eb;
              }
              .image-label {
                font-size: 12px;
                color: #666;
                margin-top: 8px;
                font-weight: 500;
              }
              
              .section { 
                background: #f9fafb;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
              }
              .section-title { 
                font-size: 16px; 
                font-weight: bold; 
                color: #1A365D; 
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e5e7eb;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .section-icon {
                width: 20px;
                height: 20px;
                background: #ED8936;
                border-radius: 4px;
              }
              
              .price-row { 
                display: flex; 
                justify-content: space-between; 
                padding: 12px 0; 
                border-bottom: 1px solid #e5e7eb;
              }
              .price-row:last-child { border-bottom: none; }
              .price-label { color: #555; }
              .price-label small { display: block; color: #888; font-size: 11px; }
              .price-value { font-weight: 600; color: #1A365D; }
              .price-value.positive { color: #059669; }
              
              .base-price-row {
                background: #1A365D;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
              }
              .base-price-label { font-weight: 500; }
              .base-price-value { font-size: 20px; font-weight: bold; }
              
              .options-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
              }
              .option-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                background: white;
                border-radius: 6px;
                font-size: 13px;
              }
              .option-name { 
                display: flex; 
                align-items: center; 
                gap: 8px;
                color: #444;
              }
              .option-check {
                width: 16px;
                height: 16px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
              }
              .option-price { font-weight: 600; color: #1A365D; }
              
              .options-subtotal {
                display: flex;
                justify-content: space-between;
                padding: 12px 15px;
                background: #e5e7eb;
                border-radius: 6px;
                margin-top: 15px;
                font-weight: 600;
              }
              
              .total-section {
                background: linear-gradient(135deg, #ED8936 0%, #DD6B20 100%);
                color: white;
                padding: 25px;
                border-radius: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 25px 0;
              }
              .total-label { font-size: 18px; font-weight: 500; }
              .total-label small { display: block; font-size: 12px; opacity: 0.9; margin-top: 3px; }
              .total-value { font-size: 32px; font-weight: bold; }
              
              .customer-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
              }
              .customer-item {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .customer-icon {
                width: 36px;
                height: 36px;
                background: #e5e7eb;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                font-size: 14px;
              }
              .customer-label { font-size: 11px; color: #888; }
              .customer-value { font-weight: 500; color: #333; }
              
              .footer { 
                margin-top: 40px; 
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center; 
                color: #666; 
                font-size: 12px; 
              }
              .footer p { margin-bottom: 8px; }
              .footer .contact { color: #1A365D; font-weight: 500; }
              .validity { 
                background: #FEF3C7; 
                color: #92400E; 
                padding: 10px 15px; 
                border-radius: 6px; 
                display: inline-block;
                margin-bottom: 15px;
                font-size: 13px;
              }
              
              @media print { 
                body { padding: 15px; }
                .section { break-inside: avoid; }
              }
            </style>
          </head>
{underConstruction && <ConstructionBanner message={ucMessage} />}
          
          <body>
            <div class="header">
              <div class="logo-section">
                <img src="${logoUrl}" alt="Sunbox Logo" class="logo" />
                <div>
                  <div class="company-name">SUNBOX MAURITIUS</div>
                  <div class="company-tagline">Container Homes & Swimming Pools</div>
                </div>
              </div>
              <div class="quote-info">
                <div class="quote-ref">Référence: <strong>${quote.referenceNumber}</strong></div>
                <div class="quote-date">Date: ${new Date(quote.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            
            <div class="model-section">
              <div class="model-title">${model.name}</div>
              <div class="model-type">${model.category === 'container' ? 'Maison Container' : 'Piscine'} • ${model.specs.dimensions || model.specs.size || ''} ${model.specs.sqm ? `• ${model.specs.sqm} m²` : ''}</div>
            </div>
            
            <div class="images-section">
              <div class="image-box">
                <img src="${model.image}" alt="${model.name}" />
                <div class="image-label">Photo du modèle</div>
              </div>
              <div class="image-box">
                <img src="${model.floorPlan}" alt="Plan ${model.name}" />
                <div class="image-label">Plan / Vue de dessus</div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">
                <div class="section-icon"></div>
                Détail des Prix
              </div>
              
              <div class="base-price-row">
                <div class="base-price-label">${model.name} - Prix de Base</div>
                <div class="base-price-value">€${quote.basePrice.toLocaleString()}</div>
              </div>
              
              ${quote.selectedOptions.length > 0 ? `
                <div style="margin-top: 20px;">
                  <div style="font-weight: 600; color: #1A365D; margin-bottom: 12px;">Options Sélectionnées (${quote.selectedOptions.length})</div>
                  <div class="options-grid">
                    ${quote.selectedOptions.map(opt => `
                      <div class="option-item">
                        <div class="option-name">
                          <div class="option-check">✓</div>
                          ${opt.name}
                        </div>
                        <div class="option-price">${opt.price >= 0 ? '+' : ''}€${opt.price.toLocaleString()}</div>
                      </div>
                    `).join('')}
                  </div>
                  <div class="options-subtotal">
                    <span>Sous-total Options</span>
                    <span>${quote.optionsTotal >= 0 ? '+' : ''}€${quote.optionsTotal.toLocaleString()}</span>
                  </div>
                </div>
              ` : '<p style="color: #888; font-style: italic;">Aucune option sélectionnée</p>'}
            </div>
            
            <div class="total-section">
              <div class="total-label">
                Total Estimé
                <small>*Le prix final peut varier selon les conditions du site</small>
              </div>
              <div class="total-value">€${quote.totalPrice.toLocaleString()}</div>
            </div>
            
            <div class="section">
              <div class="section-title">
                <div class="section-icon"></div>
                Informations Client
              </div>
              <div class="customer-section">
                <div class="customer-item">
                  <div class="customer-icon">👤</div>
                  <div>
                    <div class="customer-label">Nom</div>
                    <div class="customer-value">${quote.customerName}</div>
                  </div>
                </div>
                <div class="customer-item">
                  <div class="customer-icon">✉</div>
                  <div>
                    <div class="customer-label">Email</div>
                    <div class="customer-value">${quote.email}</div>
                  </div>
                </div>
                <div class="customer-item">
                  <div class="customer-icon">📞</div>
                  <div>
                    <div class="customer-label">Téléphone</div>
                    <div class="customer-value">${quote.phone}</div>
                  </div>
                </div>
                ${quote.location ? `
                <div class="customer-item">
                  <div class="customer-icon">📍</div>
                  <div>
                    <div class="customer-label">Localisation</div>
                    <div class="customer-value">${quote.location}</div>
                  </div>
                </div>
                ` : ''}
              </div>
              ${quote.message ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                  <div class="customer-label" style="margin-bottom: 5px;">Notes Additionnelles</div>
                  <div style="color: #555; font-size: 13px;">${quote.message}</div>
                </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <div class="validity">⏱ Ce devis est valable 30 jours à compter de la date d'émission</div>
              <p class="contact">
                Sunbox Mauritius | +230 5250 1234 | info@sunbox-mauritius.com
              </p>
              <p>
                Royal Road, Grand Baie, Mauritius
              </p>
              <p style="margin-top: 15px; color: #888;">
                © ${new Date().getFullYear()} Sunbox Mauritius. Tous droits réservés.
              </p>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for images to load before printing
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  const handlePrint = () => {
    handleDownloadPdf();
  };

  const handleNewQuote = () => {
    resetQuote();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={handleNewQuote}
              className="flex items-center gap-2 text-gray-600 hover:text-[#1A365D] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">New Quote</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ED8936] to-[#DD6B20] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-[#1A365D]">Sunbox</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-600 hover:text-[#1A365D] hover:bg-gray-100 rounded-lg transition-colors"
                title="Print Quote"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="p-2 text-gray-600 hover:text-[#1A365D] hover:bg-gray-100 rounded-lg transition-colors"
                title="Download PDF"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps - Complete */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4">
            {['Select Model', 'Configure Options', 'Your Details', 'View Quote'].map((step, idx) => (
              <React.Fragment key={step}>
                {idx > 0 && <div className="w-12 h-0.5 bg-green-500"></div>}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{step}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {status !== 'pending' && (
        <div className={`py-4 ${status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white font-semibold">
            {status === 'approved' ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Quote Approved! Our team will contact you shortly.
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ThumbsDown className="w-5 h-5" />
                Quote Declined. Feel free to create a new quote or contact us.
              </span>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-800 mb-1">Quote Generated Successfully!</h2>
              <p className="text-green-700 mb-3">
                Your personalized quote has been created. Review the details below and choose an action.
              </p>
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 inline-flex">
                <span className="text-sm text-gray-500">Reference Number:</span>
                <span className="font-mono font-bold text-[#1A365D]">{quote.referenceNumber}</span>
                <button
                  onClick={copyReferenceNumber}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Copy reference number"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quote Details */}
          <div className="lg:col-span-2 space-y-6" ref={quoteRef}>
            {/* Model Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#1A365D] to-[#2D4A7C] text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">Quote for</p>
                    <h3 className="text-2xl font-bold">{model.name}</h3>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    model.category === 'container' ? 'bg-blue-500' : 'bg-cyan-500'
                  }`}>
                    {model.category === 'container' ? (
                      <Home className="w-6 h-6" />
                    ) : (
                      <Waves className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex gap-6">
                  <img 
                    src={model.image} 
                    alt={model.name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-gray-600 mb-4">{model.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {model.specs.sqm && (
                        <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {model.specs.sqm} m²
                        </span>
                      )}
                      {model.specs.bedrooms !== undefined && (
                        <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {model.specs.bedrooms} Bedroom{model.specs.bedrooms !== 1 ? 's' : ''}
                        </span>
                      )}
                      {model.specs.bathrooms !== undefined && (
                        <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {model.specs.bathrooms} Bathroom{model.specs.bathrooms !== 1 ? 's' : ''}
                        </span>
                      )}
                      {model.specs.dimensions && (
                        <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {model.specs.dimensions}
                        </span>
                      )}
                      {model.specs.depth && (
                        <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          Depth: {model.specs.depth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-[#1A365D] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Price Breakdown
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">{model.name} - Base Price</p>
                    <p className="text-sm text-gray-500">{model.specs.dimensions || model.specs.size}</p>
                  </div>
                  <span className="text-lg font-semibold">€{quote.basePrice.toLocaleString()}</span>
                </div>

                {quote.selectedOptions.length > 0 && (
                  <div className="py-3 border-b">
                    <p className="font-medium text-gray-900 mb-3">Selected Options ({quote.selectedOptions.length})</p>
                    <div className="space-y-2">
                      {quote.selectedOptions.map((option) => (
                        <div key={option.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600">{option.name}</span>
                            <span className="text-xs text-gray-400">({option.category})</span>
                          </div>
                          <span className={option.price >= 0 ? 'text-gray-900' : 'text-green-600'}>
                            {option.price >= 0 ? '+' : ''}€{option.price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed">
                      <span className="font-medium text-gray-700">Options Subtotal</span>
                      <span className={`font-semibold ${quote.optionsTotal >= 0 ? '' : 'text-green-600'}`}>
                        {quote.optionsTotal >= 0 ? '+' : ''}€{quote.optionsTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4">
                  <div>
                    <p className="text-xl font-bold text-[#1A365D]">Estimated Total</p>
                    <p className="text-sm text-gray-500">*Final price may vary based on site conditions</p>
                  </div>
                  <span className="text-3xl font-bold text-[#1A365D]">
                    €{quote.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-[#1A365D] mb-4">Customer Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-[#1A365D] font-semibold">
                      {quote.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{quote.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{quote.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{quote.phone}</p>
                  </div>
                </div>
                {quote.location && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{quote.location}</p>
                    </div>
                  </div>
                )}
              </div>
              {quote.message && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Additional Notes</p>
                  <p className="text-gray-700">{quote.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-[#1A365D] mb-6">Quote Actions</h3>
              
              <div className="space-y-4">
                {/* Download PDF */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full flex items-center justify-center gap-3 bg-[#1A365D] hover:bg-[#2D4A7C] disabled:bg-gray-400 text-white py-4 rounded-lg font-semibold transition-colors"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Download PDF
                </button>

                {/* Send Email */}
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || emailSent}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-semibold transition-colors ${
                    emailSent 
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : emailSent ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                  {emailSent ? 'Email Sent!' : 'Send via Email'}
                </button>

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    Ready to proceed? Let us know your decision:
                  </p>

                  {/* Approve */}
                  <button
                    onClick={handleApprove}
                    disabled={status !== 'pending'}
                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-semibold transition-colors mb-3 ${
                      status === 'approved'
                        ? 'bg-green-500 text-white cursor-default'
                        : status === 'declined'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                    {status === 'approved' ? 'Approved!' : 'Approve Quote'}
                  </button>

                  {/* Decline */}
                  <button
                    onClick={handleDecline}
                    disabled={status !== 'pending'}
                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-semibold transition-colors ${
                      status === 'declined'
                        ? 'bg-red-500 text-white cursor-default'
                        : status === 'approved'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 hover:border-red-200'
                    }`}
                  >
                    <ThumbsDown className="w-5 h-5" />
                    {status === 'declined' ? 'Declined' : 'Decline Quote'}
                  </button>
                </div>

                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={handleNewQuote}
                    className="w-full text-[#ED8936] hover:text-[#DD6B20] font-medium transition-colors"
                  >
                    Create New Quote
                  </button>
                </div>
              </div>

              {/* Quote Info */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {new Date(quote.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-400">
                  This quote is valid for 30 days from the date of issue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1A365D] text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-blue-200">
            Questions about your quote? Contact us at{' '}
            <a href="mailto:info@sunbox-mauritius.com" className="text-white hover:underline">
              info@sunbox-mauritius.com
            </a>
            {' '}or call{' '}
            <a href="tel:+23052501234" className="text-white hover:underline">
              +230 5250 1234
            </a>
          </p>
          <p className="text-blue-300 text-sm mt-4">
            © {new Date().getFullYear()} Sunbox Mauritius. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default QuotePage;
