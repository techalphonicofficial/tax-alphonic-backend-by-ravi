'use strict';
const { v4: uuidv4 } = require('uuid');

// Adds the uirefrence.html footer sections to the footer menu (location "footer") as three-level
// items: main heading → column heading → links ("+N more →" is the last link of a column).
// Existing links stay as they are; a section whose title is already a top-level item is skipped.
const SECTIONS = [
  {
    "title": "Business Services",
    "columns": [
      {
        "title": "🚀 Startup",
        "links": [
          [
            "Proprietorship",
            "/proprietorship-registration"
          ],
          [
            "Partnership",
            "/partnership-firm-registration"
          ],
          [
            "One Person Company",
            "/one-person-company-registration"
          ],
          [
            "Limited Liability Partnership",
            "/llp-registration"
          ],
          [
            "Private Limited Company",
            "/private-limited-company-registration"
          ],
          [
            "Section 8 Company",
            "/section-8-company-registration"
          ],
          [
            "+14 more →",
            "/category/startup"
          ]
        ]
      },
      {
        "title": "📋 Registrations",
        "links": [
          [
            "Startup India",
            "/startup-india-registration"
          ],
          [
            "Trade License",
            "/trade-license"
          ],
          [
            "FSSAI Registration",
            "/fssai-registration"
          ],
          [
            "FSSAI License",
            "/fssai-license"
          ],
          [
            "Halal License & Certification",
            "/halal-certification"
          ],
          [
            "ICEGATE Registration",
            "/icegate-registration"
          ],
          [
            "+33 more →",
            "/category/registrations"
          ]
        ]
      },
      {
        "title": "™️ Trademark",
        "links": [
          [
            "Trademark Registration",
            "/trademark-registration"
          ],
          [
            "Trademark Objection",
            "/trademark-objection"
          ],
          [
            "Trademark Certificate",
            "/trademark-certificate"
          ],
          [
            "Trademark Opposition",
            "/trademark-opposition"
          ],
          [
            "Trademark Hearing",
            "/trademark-hearing"
          ],
          [
            "Trademark Rectification",
            "/trademark-rectification"
          ],
          [
            "+15 more →",
            "/category/trademark"
          ]
        ]
      },
      {
        "title": "📑 GST",
        "links": [
          [
            "GST Registration",
            "/gst-registration"
          ],
          [
            "GST Return Filing by Accountant",
            "/gst-return-filing"
          ],
          [
            "GST LUT Form",
            "/gst-lut-form"
          ],
          [
            "GST Notice",
            "/gst-notice"
          ],
          [
            "GST Annual Return (GSTR-9)",
            "/gst-annual-return"
          ],
          [
            "GST Registration for Foreigners",
            "/gst-registration-foreigners"
          ],
          [
            "+6 more →",
            "/category/gst"
          ]
        ]
      },
      {
        "title": "📈 Income Tax",
        "links": [
          [
            "Income Tax E-Filing",
            "/income-tax-filing"
          ],
          [
            "Business ITR Filing",
            "/business-itr-filing"
          ],
          [
            "Partnership Firm / LLP ITR",
            "/itr-5-filing"
          ],
          [
            "Company ITR Filing",
            "/itr-6-filing"
          ],
          [
            "Trust / NGO Tax Filing",
            "/itr-7-filing"
          ],
          [
            "15CA - 15CB Filing",
            "/15ca-15cb-filing"
          ],
          [
            "+13 more →",
            "/category/income-tax"
          ]
        ]
      },
      {
        "title": "🏛️ MCA",
        "links": [
          [
            "Company Compliance",
            "/company-annual-filing"
          ],
          [
            "LLP Compliance",
            "/llp-annual-filing"
          ],
          [
            "OPC Compliance",
            "/opc-compliance"
          ],
          [
            "Name Change - Company",
            "/company-name-change"
          ],
          [
            "Registered Office Change",
            "/registered-office-change"
          ],
          [
            "DIN eKYC Filing",
            "/din-ekyc-filing"
          ],
          [
            "+17 more →",
            "/category/mca"
          ]
        ]
      },
      {
        "title": "✅ Compliance",
        "links": [
          [
            "FDI Filing",
            "/fdi-filing-rbi"
          ],
          [
            "ODI Filing",
            "/odi-filing"
          ],
          [
            "FLA Return Filing",
            "/fla-return-filing"
          ],
          [
            "FSSAI Renewal",
            "/fssai-renewal"
          ],
          [
            "FSSAI Return Filing",
            "/fssai-return-filing"
          ],
          [
            "Business Plan",
            "/business-plan"
          ],
          [
            "+24 more →",
            "/category/compliance"
          ]
        ]
      },
      {
        "title": "🌍 Global",
        "links": [
          [
            "UAE Company Registration",
            "/uae-company-registration"
          ],
          [
            "USA Company Registration",
            "/usa-company-registration"
          ],
          [
            "Singapore Business Setup",
            "/singapore-company-registration"
          ],
          [
            "UK Company Registration",
            "/uk-company-registration"
          ],
          [
            "USA Trademark Registration",
            "/usa-trademark-registration"
          ],
          [
            "Import Export Code",
            "/import-export-code"
          ],
          [
            "+9 more →",
            "/category/global"
          ]
        ]
      }
    ]
  },
  {
    "title": "Knowledge & Advisory",
    "columns": [
      {
        "title": "📚 Taxpedia",
        "links": [
          [
            "Direct Tax",
            "/taxpedia/direct-tax"
          ],
          [
            "GST",
            "/taxpedia/gst"
          ],
          [
            "Company Law",
            "/taxpedia/company-law"
          ],
          [
            "Corporate Law",
            "/taxpedia/corporate-law"
          ],
          [
            "RBI",
            "/taxpedia/rbi"
          ],
          [
            "FEMA",
            "/taxpedia/fema"
          ],
          [
            "+9 more →",
            "/taxpedia"
          ]
        ]
      },
      {
        "title": "💼 Business Advisory",
        "links": [
          [
            "Regulatory",
            "/taxpedia"
          ],
          [
            "Legal",
            "/taxpedia"
          ],
          [
            "Tax",
            "/taxpedia"
          ],
          [
            "Capital Advisory",
            "/taxpedia"
          ],
          [
            "Business Transformation",
            "/taxpedia"
          ],
          [
            "Technology",
            "/taxpedia"
          ],
          [
            "+4 more →",
            "/taxpedia"
          ]
        ]
      },
      {
        "title": "📝 Legal Drafting",
        "links": [
          [
            "Employment",
            "/legal-drafting/employment"
          ],
          [
            "Corporate",
            "/legal-drafting/corporate"
          ],
          [
            "Daily Business",
            "/legal-drafting/daily-business"
          ],
          [
            "Legal Agreements",
            "/legal-drafting/legal-agreements"
          ],
          [
            "Banking & Finance",
            "/legal-drafting/banking-and-finance"
          ],
          [
            "Business Agreements",
            "/legal-drafting/business-agreements"
          ],
          [
            "+2 more →",
            "/legal-drafting"
          ]
        ]
      },
      {
        "title": "⚖️ Lawyer Services",
        "links": [
          [
            "Talk to an Expert",
            "/lawyer-services/talk-to-an-expert"
          ],
          [
            "Personal & Family",
            "/lawyer-services/personal-and-family"
          ],
          [
            "Notices & Disputes",
            "/lawyer-services/notices-and-disputes"
          ],
          [
            "Business Contracts",
            "/lawyer-services/business-contracts"
          ],
          [
            "HR & Policies",
            "/lawyer-services/hr-and-policies"
          ],
          [
            "NGO & Trust",
            "/lawyer-services/ngo-and-trust"
          ],
          [
            "+1 more →",
            "/lawyer-services"
          ]
        ]
      },
      {
        "title": "🧩 Products",
        "links": [
          [
            "For Individuals",
            "/products/for-individuals"
          ],
          [
            "GST Software",
            "/products/gst-software"
          ],
          [
            "For Enterprises",
            "/products/for-enterprises"
          ],
          [
            "TDS Software",
            "/products/tds-software"
          ],
          [
            "For CAs & SMEs",
            "/products/for-cas-and-smes"
          ],
          [
            "Tools & Calculators",
            "/products/tools-and-calculators"
          ]
        ]
      },
      {
        "title": "🏛️ GeM Services",
        "links": [
          [
            "Seller / Service Provider Registration",
            "/gem-services/seller--service-provider-registration"
          ],
          [
            "Catalogue & Listing",
            "/gem-services/catalogue-and-listing"
          ],
          [
            "Vendor Assessment & OEM",
            "/gem-services/vendor-assessment-and-oem"
          ],
          [
            "Bidding & Tenders",
            "/gem-services/bidding-and-tenders"
          ],
          [
            "Order & Fulfilment",
            "/gem-services/order-and-fulfilment"
          ],
          [
            "MSME & Startup Benefits",
            "/gem-services/msme-and-startup-benefits"
          ],
          [
            "+2 more →",
            "/gem-services"
          ]
        ]
      },
      {
        "title": "⚡ Quick Update",
        "links": [
          [
            "Articles",
            "/taxpedia/articles"
          ],
          [
            "News",
            "/taxpedia/news"
          ],
          [
            "Judiciary",
            "/taxpedia/judiciary"
          ],
          [
            "ITR",
            "/taxpedia/itr"
          ],
          [
            "Notifications",
            "/taxpedia/notifications"
          ],
          [
            "Circulars",
            "/taxpedia/circulars"
          ],
          [
            "+3 more →",
            "/taxpedia"
          ]
        ]
      },
      {
        "title": "📊 Budget",
        "links": [
          [
            "Union Budget 2026",
            "/budget/2026"
          ],
          [
            "Union Budget 2025",
            "/budget/2025"
          ],
          [
            "Union Budget 2024",
            "/budget/2024"
          ],
          [
            "Union Budget 2023",
            "/budget/2023"
          ],
          [
            "Union Budget 2022",
            "/budget/2022"
          ]
        ]
      },
      {
        "title": "💰 Business Loan",
        "links": [
          [
            "🏛️ Government Banks",
            "/loan/government"
          ],
          [
            "🏦 Private Banks",
            "/loan/private"
          ],
          [
            "⚡ NBFCs",
            "/loan/nbfc"
          ]
        ]
      },
      {
        "title": "🚀 Business Journey",
        "links": [
          [
            "Idea & Structure",
            "/journey/idea"
          ],
          [
            "Company Registration",
            "/journey/register"
          ],
          [
            "Licenses & Registrations",
            "/journey/licenses"
          ],
          [
            "Protect Your Brand",
            "/journey/ip"
          ],
          [
            "Office & Infrastructure Setup",
            "/journey/setup"
          ],
          [
            "Team & HR Setup",
            "/journey/hiring"
          ],
          [
            "+4 more →",
            "/journey"
          ]
        ]
      },
      {
        "title": "🏛️ My Schemes",
        "links": [
          [
            "🌾 PM-KISAN",
            "/scheme/pm-kisan"
          ],
          [
            "💳 Kisan Credit Card (KCC)",
            "/scheme/kisan-credit-card"
          ],
          [
            "🏭 PMEGP",
            "/scheme/pmegp"
          ],
          [
            "💼 Pradhan Mantri Mudra Yojana (PMMY)",
            "/scheme/mudra-yojana"
          ],
          [
            "🚀 Stand-Up India",
            "/scheme/stand-up-india"
          ],
          [
            "⚡ Startup India",
            "/scheme/startup-india"
          ],
          [
            "+10 more →",
            "/schemes"
          ]
        ]
      },
      {
        "title": "📝 Blogs",
        "links": [
          [
            "GST Registration: A Complete 2026 Guide",
            "/blog"
          ],
          [
            "GST Return Filing: Types, Due Dates & Penalties",
            "/blog"
          ],
          [
            "Private Limited vs LLP: Which to Choose",
            "/blog"
          ],
          [
            "How to Register a Private Limited Company",
            "/blog"
          ],
          [
            "How to File Your Income Tax Return Online",
            "/blog"
          ],
          [
            "TDS: Rates, Returns & Due Dates Explained",
            "/blog"
          ],
          [
            "+6 more →",
            "/blog"
          ]
        ]
      }
    ]
  }
];

const footerMenuId = async (queryInterface) => {
    const [menus] = await queryInterface.sequelize.query(
        "SELECT id FROM menus WHERE location = 'footer' ORDER BY (status = 'active') DESC, createdAt ASC LIMIT 1"
    );
    return menus[0]?.id || null;
};

module.exports = {
    up: async (queryInterface) => {
        const menuId = await footerMenuId(queryInterface);
        if (!menuId) return; // no footer menu yet: nothing to add to

        const [tops] = await queryInterface.sequelize.query(
            'SELECT title, displayOrder FROM menu_items WHERE menuId = ? AND parentId IS NULL',
            { replacements: [menuId] }
        );
        const existing = new Set(tops.map(t => t.title));
        let order = tops.reduce((max, t) => Math.max(max, t.displayOrder || 0), -1) + 1;
        const now = new Date();
        const rows = [];
        const item = (parentId, title, url, displayOrder) => {
            const id = uuidv4();
            rows.push({ id, menuId, parentId, title, url, target: '_self', displayOrder, createdAt: now, updatedAt: now });
            return id;
        };

        for (const section of SECTIONS) {
            if (existing.has(section.title)) continue;
            const sectionId = item(null, section.title, '#', order++);
            section.columns.forEach((column, c) => {
                const columnId = item(sectionId, column.title, '#', c);
                column.links.forEach(([label, url], l) => item(columnId, label, url || '#', l));
            });
        }

        if (rows.length) await queryInterface.bulkInsert('menu_items', rows);
    },

    down: async (queryInterface) => {
        const menuId = await footerMenuId(queryInterface);
        if (!menuId) return;
        const titles = SECTIONS.map(s => s.title);
        const [sections] = await queryInterface.sequelize.query(
            'SELECT id FROM menu_items WHERE menuId = ? AND parentId IS NULL AND title IN (?)',
            { replacements: [menuId, titles] }
        );
        if (!sections.length) return;
        const sectionIds = sections.map(s => s.id);
        const [columns] = await queryInterface.sequelize.query(
            'SELECT id FROM menu_items WHERE parentId IN (?)', { replacements: [sectionIds] }
        );
        const columnIds = columns.map(c => c.id);
        if (columnIds.length) await queryInterface.bulkDelete('menu_items', { parentId: columnIds });
        await queryInterface.bulkDelete('menu_items', { id: [...columnIds, ...sectionIds] });
    }
};
