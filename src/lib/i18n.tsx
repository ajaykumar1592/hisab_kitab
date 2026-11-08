'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

export const translations: Translations = {
  // Navigation
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  customers: { en: 'Customers', hi: 'ग्राहक' },
  ledger: { en: 'Khata / Ledger', hi: 'खाता बही (लेज़र)' },
  rateList: { en: 'Rate List', hi: 'रेट लिस्ट (मूल्य सूची)' },
  receipts: { en: 'Receipts', hi: 'रसीदें' },
  reports: { en: 'Reports', hi: 'रिपोर्ट्स' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  materialCategories: { en: 'Material Categories', hi: 'सामग्री श्रेणियाँ' },
  exportData: { en: 'Export Data', hi: 'डेटा निर्यात' },
  signOut: { en: 'Sign Out', hi: 'साइन आउट' },
  installApp: { en: 'Install App', hi: 'ऐप इंस्टॉल करें' },

  // Dashboard Stats
  overviewBusiness: { en: 'Overview of your business', hi: 'आपके व्यापार का संपूर्ण विवरण' },
  totalCustomers: { en: 'Total Customers', hi: 'कुल ग्राहक' },
  totalReceivable: { en: 'Total Receivable', hi: 'कुल लेना (Receivable)' },
  totalPayable: { en: 'Total Payable', hi: 'कुल देना (Payable)' },
  rateListItems: { en: 'Rate List Items', hi: 'रेट लिस्ट सामग्री' },
  todayCredit: { en: "Today's Credit", hi: 'आज का उधार (क्रेडिट)' },
  todayPayments: { en: "Today's Payments", hi: 'आज की वसूली (पेमेंट्स)' },
  thisMonthSales: { en: 'This Month Sales', hi: 'इस महीने की कुल बिक्री' },
  thisMonthPayments: { en: 'This Month Payments', hi: 'इस महीने के पेमेंट्स' },
  outstandingCustomers: { en: 'Customers with Outstanding', hi: 'बकाया वाले ग्राहक' },
  recentTransactions: { en: 'Recent Transactions', hi: 'हाल के लेन-देन' },
  viewAll: { en: 'View All', hi: 'सभी देखें' },
  viewDetails: { en: 'View details', hi: 'विवरण देखें' },
  addCustomer: { en: 'Add Customer', hi: 'नया ग्राहक जोड़ें' },
  addTransaction: { en: 'Add Transaction', hi: 'लेन-देन जोड़ें' },
  noOutstanding: { en: 'No outstanding balances', hi: 'कोई बकाया शेष नहीं है' },
  noRecentTxn: { en: 'No recent transactions', hi: 'हाल में कोई लेन-देन नहीं हुआ' },

  // Customer Management
  manageCustomers: { en: 'Manage your customer accounts', hi: 'अपने सभी ग्राहक खातों का प्रबंधन करें' },
  searchPlaceholder: { en: 'Search by name, mobile...', hi: 'नाम या मोबाइल नंबर से खोजें...' },
  all: { en: 'All', hi: 'सभी' },
  active: { en: 'Active', hi: 'सक्रिय' },
  archived: { en: 'Archived', hi: 'संग्रहीत' },
  inactive: { en: 'Inactive', hi: 'निष्क्रिय' },
  status: { en: 'Status', hi: 'स्थिति' },
  balance: { en: 'Balance', hi: 'शेष राशि (बैलेंस)' },
  lastTransaction: { en: 'Last Transaction', hi: 'अंतिम लेन-देन' },
  actions: { en: 'Actions', hi: 'कार्रवाई' },
  noCustomersFound: { en: 'No customers found', hi: 'कोई ग्राहक नहीं मिला' },
  addFirstCustomer: { en: 'Add your first customer', hi: 'अपना पहला ग्राहक जोड़ें' },
  dr: { en: ' Dr (लेना)', hi: ' लेना (Dr)' },
  cr: { en: ' Cr (देना)', hi: ' देना (Cr)' },
  viewLedger: { en: 'View Ledger', hi: 'खाता देखें' },
  receivePayment: { en: 'Receive Payment', hi: 'भुगतान प्राप्त करें' },
  call: { en: 'Call', hi: 'कॉल करें' },
  edit: { en: 'Edit', hi: 'संपादित करें' },
  delete: { en: 'Delete', hi: 'हटाएं' },

  // Customer Form
  newCustomer: { en: 'Add New Customer', hi: 'नया ग्राहक जोड़ें' },
  editCustomer: { en: 'Edit Customer', hi: 'ग्राहक विवरण संपादित करें' },
  fullName: { en: 'Full Name *', hi: 'पूरा नाम *' },
  mobileNumber: { en: 'Mobile Number', hi: 'मोबाइल नंबर' },
  altMobile: { en: 'Alternate Mobile', hi: 'वैकल्पिक मोबाइल' },
  whatsappNumber: { en: 'WhatsApp Number', hi: 'व्हाट्सएप नंबर' },
  businessType: { en: 'Business Type', hi: 'व्यापार का प्रकार' },
  address: { en: 'Address', hi: 'पता' },
  city: { en: 'City', hi: 'शहर' },
  state: { en: 'State', hi: 'राज्य' },
  pinCode: { en: 'PIN Code', hi: 'पिन कोड' },
  email: { en: 'Email Address', hi: 'ईमेल पता' },
  gstin: { en: 'GSTIN Number', hi: 'जीएसटी नंबर (GSTIN)' },
  openingBalance: { en: 'Opening Balance', hi: 'प्रारंभिक शेष (Opening Balance)' },
  openingBalanceType: { en: 'Balance Type', hi: 'शेष का प्रकार' },
  receivable: { en: 'Receivable (Customer owes you)', hi: 'लेना है (ग्राहक से पाना है)' },
  payable: { en: 'Payable (You owe customer)', hi: 'देना है (ग्राहक को देना है)' },
  notes: { en: 'Notes', hi: 'टिप्पणी / नोट्स' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  saveCustomer: { en: 'Create Customer', hi: 'ग्राहक बनाएं' },
  updateCustomer: { en: 'Save Changes', hi: 'बदलाव सुरक्षित करें' },
  backToCustomers: { en: 'Back to Customers', hi: 'वापस ग्राहकों पर जाएं' },

  // Khata / Ledger
  ledgerTitle: { en: 'Khata / Ledger Book', hi: 'खाता बही (डिजिटल खाता)' },
  ledgerSubtitle: { en: 'Complete debit and credit transactions', hi: 'सभी जमा और उधार लेन-देन का ब्योरा' },
  transactionDate: { en: 'Date', hi: 'तारीख' },
  transactionType: { en: 'Type', hi: 'प्रकार' },
  creditSale: { en: 'Credit (उधार सामान दिया)', hi: 'उधार (सामान दिया)' },
  debitEntry: { en: 'Debit (डेबिट)', hi: 'डेबिट' },
  paymentReceived: { en: 'Payment Received (रुपये मिले)', hi: 'भुगतान मिला (वसूली)' },
  amount: { en: 'Amount', hi: 'रकम (राशि)' },
  description: { en: 'Description', hi: 'विवरण' },
  referenceNumber: { en: 'Reference No.', hi: 'बिल / रसीद नं.' },
  paymentMethod: { en: 'Payment Method', hi: 'भुगतान का माध्यम' },
  cash: { en: 'Cash', hi: 'नकद (Cash)' },
  upi: { en: 'UPI (GPay / PhonePe / Paytm)', hi: 'यूपीआई (UPI)' },
  bankTransfer: { en: 'Bank Transfer / NEFT', hi: 'बैंक ट्रांसफर' },
  cheque: { en: 'Cheque', hi: 'चेक (Cheque)' },
  saveTransaction: { en: 'Save Transaction', hi: 'लेन-देन दर्ज करें' },

  // Rate List
  rateListTitle: { en: 'Rate List & Material Catalog', hi: 'रेट लिस्ट एवं सामग्री मूल्य' },
  rateListSubtitle: { en: 'Master pricing and catalog for your products', hi: 'सभी उत्पादों और सामग्रियों की तय कीमतें' },
  itemName: { en: 'Item Name', hi: 'सामग्री / वस्तु का नाम' },
  itemCode: { en: 'Item Code', hi: 'कोड' },
  category: { en: 'Category', hi: 'श्रेणी' },
  unit: { en: 'Unit', hi: 'इकाई (Unit)' },
  quantity: { en: 'Qty', hi: 'मात्रा' },
  baseRate: { en: 'Base Rate', hi: 'मूल दर (Rate)' },
  gstRate: { en: 'GST %', hi: 'जीएसटी %' },
  finalRate: { en: 'Final Rate', hi: 'अंतिम दर (कुल मूल्य)' },
  addProduct: { en: 'Add Product / Item', hi: 'नया उत्पाद जोड़ें' },
  addNewItem: { en: 'Add New Item', hi: 'नया उत्पाद / सामग्री जोड़ें' },
  createProductSubtitle: { en: 'Create a new product in your rate list', hi: 'अपनी रेट लिस्ट में एक नया उत्पाद जोड़ें' },
  editProductTitle: { en: 'Edit Product / Item', hi: 'उत्पाद / सामग्री संपादित करें' },
  editProductSubtitle: { en: 'Update product information and pricing', hi: 'उत्पाद का विवरण और कीमतें अपडेट करें' },
  productInformation: { en: 'Product Information', hi: 'उत्पाद विवरण' },
  pricingAndTax: { en: 'Pricing & Tax', hi: 'मूल्य और टैक्स' },
  hsnCode: { en: 'HSN / SAC Code', hi: 'एचएसएन / एसएसी कोड' },
  creatingProduct: { en: 'Creating Product...', hi: 'उत्पाद जोड़ा जा रहा है...' },
  savingChanges: { en: 'Saving Changes...', hi: 'बदलाव सुरक्षित हो रहे हैं...' },
  saveProduct: { en: 'Save Product', hi: 'उत्पाद सुरक्षित करें' },
  rateListPdfTitle: { en: 'Rate List PDF', hi: 'रेट लिस्ट पीडीएफ' },
  downloadPdf: { en: 'Download PDF', hi: 'पीडीएफ डाउनलोड करें' },
  printPdf: { en: 'Print', hi: 'प्रिंट करें' },
  pdfSettings: { en: 'PDF Settings', hi: 'पीडीएफ सेटिंग्स' },
  deleteConfirm: { en: 'Are you sure you want to delete this product?', hi: 'क्या आप वाकई इस उत्पाद को हटाना चाहते हैं?' },
  importRateList: { en: 'Import Rate List', hi: 'रेट लिस्ट इम्पोर्ट करें' },
  exportPDF: { en: 'Export / Print PDF', hi: 'पीडीएफ डाउनलोड / प्रिंट' },

  // PDF Rate List
  generateDownloadRateList: { en: 'Generate and download rate list as PDF', hi: 'रेट लिस्ट को पीडीएफ के रूप में जनरेट और डाउनलोड करें' },
  pdfPreview: { en: 'PDF Preview', hi: 'पीडीएफ पूर्वावलोकन' },
  productsCount: { en: '{count} products', hi: '{count} उत्पाद' },
  configurePdfOutput: { en: 'Configure the PDF output', hi: 'पीडीएफ आउटपुट कॉन्फिगर करें' },
  companyName: { en: 'Company Name', hi: 'कंपनी का नाम' },
  companyAddress: { en: 'Company Address', hi: 'कंपनी का पता' },
  reportTitle: { en: 'Report Title', hi: 'रिपोर्ट शीर्षक' },
  filterByCategory: { en: 'Filter by Category', hi: 'श्रेणी द्वारा फ़िल्टर करें' },
  filterByStatus: { en: 'Filter by Status', hi: 'स्थिति द्वारा फ़िल्टर करें' },
  allCategories: { en: 'All Categories', hi: 'सभी श्रेणियाँ' },
  includeInactiveProducts: { en: 'Include Inactive Products', hi: 'निष्क्रिय उत्पाद शामिल करें' },
  showHSNCode: { en: 'Show HSN Code', hi: 'एचएसएन कोड दिखाएं' },
  showDescription: { en: 'Show Description', hi: 'विवरण दिखाएं' },
  retry: { en: 'Retry', hi: 'पुनः प्रयास करें' },
  sNo: { en: '#', hi: 'क्र.सं.' },
  items: { en: 'items', hi: 'आइटम' },
  generatedOn: { en: 'Generated on', hi: 'जनरेट किया गया' },
  computerGenerated: { en: 'This is a computer-generated document. No signature required.', hi: 'यह एक कंप्यूटर-जनरेटेड दस्तावेज़ है। हस्ताक्षर की आवश्यकता नहीं है।' },

  // Settings & Language Switch
  settingsTitle: { en: 'Business Settings', hi: 'व्यापार सेटिंग्स' },
  settingsSubtitle: { en: 'Configure your company details, language and preferences', hi: 'अपनी कंपनी, भाषा और प्राथमिकताएं सेट करें' },
  generalSettings: { en: 'General', hi: 'सामान्य' },
  languageSettings: { en: 'Language (भाषा)', hi: 'भाषा चुनें (Language)' },
  languageDescription: { en: 'Select your preferred application language', hi: 'अपनी पसंदीदा भाषा का चयन करें (English या हिन्दी)' },
  english: { en: 'English', hi: 'English (अंग्रेज़ी)' },
  hindi: { en: 'हिन्दी (Hindi)', hi: 'हिन्दी (Hindi)' },
  languageSwitchedSuccess: { en: 'Language updated successfully!', hi: 'भाषा सफलतापूर्वक बदल दी गई है!' },
  businessName: { en: 'Business Name', hi: 'दुकान / व्यापार का नाम' },
  saveSettings: { en: 'Save Settings', hi: 'सेटिंग्स सुरक्षित करें' },
  whatsappIntegration: { en: 'WhatsApp Integration', hi: 'व्हाट्सएप इंटीग्रेशन' },
  receiptsFormat: { en: 'Receipt Format', hi: 'रसीद प्रारूप' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
  isHindi: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
  isHindi: false,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load persisted language from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hisab_kitab_language') as Language;
      if (saved === 'hi' || saved === 'en') {
        setLanguageState(saved);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hisab_kitab_language', lang);
      document.documentElement.lang = lang;
    }
  };

  const t = (key: string, defaultText?: string): string => {
    if (translations[key]) {
      return translations[key][language] || translations[key].en || defaultText || key;
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isHindi: language === 'hi',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
