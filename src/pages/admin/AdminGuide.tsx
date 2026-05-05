import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Inbox, BedDouble, Building2,
  Users, Settings, Archive, BarChart3, BookOpen, ChevronRight,
  CheckCircle, AlertCircle, Info,
} from "lucide-react";

type SectionId =
  | "overview" | "roles" | "dashboard" | "calendar" | "bookings"
  | "rooms" | "users" | "settings" | "analytics" | "archive";

interface Section {
  id: SectionId;
  icon: React.ElementType;
  color: string;
}

const SECTIONS: Section[] = [
  { id: "overview",   icon: BookOpen,        color: "text-blue-600" },
  { id: "roles",      icon: Users,           color: "text-violet-600" },
  { id: "dashboard",  icon: LayoutDashboard, color: "text-primary" },
  { id: "calendar",   icon: Calendar,        color: "text-teal-600" },
  { id: "bookings",   icon: Inbox,           color: "text-amber-600" },
  { id: "rooms",      icon: BedDouble,       color: "text-rose-600" },
  { id: "users",      icon: Users,           color: "text-indigo-600" },
  { id: "settings",   icon: Settings,        color: "text-slate-600" },
  { id: "analytics",  icon: BarChart3,       color: "text-emerald-600" },
  { id: "archive",    icon: Archive,         color: "text-orange-600" },
];

// ─── Section content (bilingual) ─────────────────────────────────────────────

interface GuideBlock {
  type: "paragraph" | "list" | "tip" | "warning" | "subheading";
  text?: string;
  items?: string[];
}

interface SectionContent {
  title: string;
  blocks: GuideBlock[];
}

const CONTENT: Record<SectionId, { en: SectionContent; uk: SectionContent }> = {
  overview: {
    en: {
      title: "Panel Overview",
      blocks: [
        { type: "paragraph", text: "Hotel Continent Admin Panel lets staff and management monitor reservations, manage rooms, track revenue, and configure hotel settings — all from one interface." },
        { type: "subheading", text: "Who can use the panel?" },
        { type: "list", items: [
          "Super Admin / Owner — full access",
          "Admin — bookings, calendar, rooms, profile",
          "Viewer — read-only: dashboard, calendar, bookings",
        ]},
        { type: "tip", text: "Switch the interface language using the EN | УК toggle in the left sidebar or mobile header." },
      ],
    },
    uk: {
      title: "Огляд панелі",
      blocks: [
        { type: "paragraph", text: "Адмін-панель Hotel Continent дозволяє персоналу та менеджменту відстежувати бронювання, керувати номерами, аналізувати дохід та налаштовувати параметри готелю — в одному інтерфейсі." },
        { type: "subheading", text: "Хто може використовувати панель?" },
        { type: "list", items: [
          "Супер-адмін / Власник — повний доступ",
          "Адмін — бронювання, календар, номери, профіль",
          "Перегляд — лише читання: панель, календар, бронювання",
        ]},
        { type: "tip", text: "Перемикайте мову інтерфейсу кнопкою EN | УК у лівій боковій панелі або мобільному заголовку." },
      ],
    },
  },

  roles: {
    en: {
      title: "Roles & Permissions",
      blocks: [
        { type: "paragraph", text: "Each user has exactly one role assigned in the system. Roles determine which sections and actions are available." },
        { type: "subheading", text: "Owner" },
        { type: "list", items: [
          "Dedicated Owner Dashboard with revenue KPIs",
          "Full Analytics section with charts and metrics",
          "Can view and manage all users — including assigning Super Admin role",
          "Can view Archive and manage Settings",
          "Calendar is visible (read + tooltips)",
        ]},
        { type: "subheading", text: "Super Admin" },
        { type: "list", items: [
          "All Admin capabilities",
          "Manage users: create, change roles, see all accounts",
          "Access Archive of past reservations",
        ]},
        { type: "subheading", text: "Admin" },
        { type: "list", items: [
          "Full Bookings management (confirm, check-in/out, add notes)",
          "Calendar view and editing",
          "Room types and room units management",
          "Edit own profile",
          "Hotel Settings",
        ]},
        { type: "subheading", text: "Viewer" },
        { type: "list", items: [
          "Read-only access to Dashboard, Calendar, Bookings",
          "Cannot modify any data",
        ]},
        { type: "warning", text: "A user without a role in user_roles table will be denied login to the admin panel entirely." },
      ],
    },
    uk: {
      title: "Ролі та дозволи",
      blocks: [
        { type: "paragraph", text: "Кожен користувач має одну роль у системі. Роль визначає доступні розділи та дії." },
        { type: "subheading", text: "Власник" },
        { type: "list", items: [
          "Власна панель із ключовими показниками доходу",
          "Повний розділ Аналітики з графіками та метриками",
          "Перегляд і управління всіма користувачами — включно з призначенням ролі Супер-адміна",
          "Перегляд Архіву та управління Налаштуваннями",
          "Доступ до Календаря (перегляд + підказки)",
        ]},
        { type: "subheading", text: "Супер-адмін" },
        { type: "list", items: [
          "Всі можливості Адміна",
          "Управління користувачами: створення, зміна ролей, перегляд всіх акаунтів",
          "Доступ до Архіву минулих бронювань",
        ]},
        { type: "subheading", text: "Адмін" },
        { type: "list", items: [
          "Повне управління бронюваннями (підтвердження, заїзд/виїзд, нотатки)",
          "Перегляд та редагування Календаря",
          "Управління типами та одиницями номерів",
          "Редагування власного профілю",
          "Налаштування готелю",
        ]},
        { type: "subheading", text: "Перегляд" },
        { type: "list", items: [
          "Тільки читання: Панель, Календар, Бронювання",
          "Не може змінювати жодні дані",
        ]},
        { type: "warning", text: "Користувач без ролі у таблиці user_roles не зможе увійти в адмін-панель." },
      ],
    },
  },

  dashboard: {
    en: {
      title: "Dashboard",
      blocks: [
        { type: "paragraph", text: "The Dashboard shows today's quick summary: arrivals, departures, current guests, and pending requests." },
        { type: "list", items: [
          "Today's arrivals and departures count",
          "Guests currently staying",
          "Pending booking requests from the website",
          "Recent bookings list with status badges",
        ]},
        { type: "tip", text: "Click on any booking row to open it directly in the Bookings section." },
      ],
    },
    uk: {
      title: "Панель керування",
      blocks: [
        { type: "paragraph", text: "Панель відображає короткий підсумок дня: заїзди, виїзди, поточні гості та очікуючі запити." },
        { type: "list", items: [
          "Кількість заїздів та виїздів сьогодні",
          "Гості, що зараз проживають",
          "Очікуючі запити на бронювання з сайту",
          "Список останніх бронювань із позначками статусу",
        ]},
        { type: "tip", text: "Клацніть на будь-який рядок бронювання, щоб відкрити його у розділі Бронювання." },
      ],
    },
  },

  calendar: {
    en: {
      title: "Calendar",
      blocks: [
        { type: "paragraph", text: "The Calendar section visualises all room bookings in a room-by-date grid. It is the fastest way to see room availability at a glance." },
        { type: "subheading", text: "Reading the grid" },
        { type: "list", items: [
          "Rows = individual room units (e.g. Room 101, Suite 301)",
          "Columns = dates (navigate with arrows or month picker)",
          "Coloured pills = confirmed bookings; transparency indicates status",
          "Half-cell pill edge = standard 12:00 check-in / check-out time",
          "Full-cell pill edge = early check-in (≥ 08:00) or late check-out (≥ 14:00) fee applied",
        ]},
        { type: "subheading", text: "Pill colours by status" },
        { type: "list", items: [
          "Blue — CONFIRMED",
          "Green — CHECK_IN (currently staying)",
          "Grey — CHECK_OUT (departed)",
          "Amber — PENDING (awaiting action)",
        ]},
        { type: "subheading", text: "Actions" },
        { type: "list", items: [
          "Click a pill → opens the booking detail dialog",
          "Click an empty cell → opens a new booking dialog for that room/date",
          "Hover a pill → shows a summary tooltip with guest name, dates, amount due",
        ]},
        { type: "tip", text: "Room category names are displayed in your selected language (EN/UK). Bed configuration is shown under each room name." },
      ],
    },
    uk: {
      title: "Календар",
      blocks: [
        { type: "paragraph", text: "Розділ Календар відображає всі бронювання у вигляді сітки «номер × дата». Найшвидший спосіб побачити доступність номерів." },
        { type: "subheading", text: "Як читати сітку" },
        { type: "list", items: [
          "Рядки = окремі номери (наприклад, Кімната 101, Люкс 301)",
          "Стовпці = дати (навігація стрілками або вибором місяця)",
          "Кольорові плашки = підтверджені бронювання; прозорість вказує статус",
          "Плашка до половини клітинки = стандартний час 12:00 заїзду / виїзду",
          "Плашка до краю клітинки = застосовано збір за ранній заїзд (≥ 08:00) або пізній виїзд (≥ 14:00)",
        ]},
        { type: "subheading", text: "Кольори плашок за статусом" },
        { type: "list", items: [
          "Синій — ПІДТВЕРДЖЕНО",
          "Зелений — ЗАЇЗД (зараз проживає)",
          "Сірий — ВИЇЗД (виїхав)",
          "Бурштиновий — ОЧІКУЄ (потребує дії)",
        ]},
        { type: "subheading", text: "Дії" },
        { type: "list", items: [
          "Клік на плашку → відкриває детальний діалог бронювання",
          "Клік на порожню клітинку → відкриває діалог нового бронювання для цього номера/дати",
          "Наведення на плашку → показує підказку з ім'ям гостя, датами та сумою до сплати",
        ]},
        { type: "tip", text: "Назви категорій номерів відображаються вибраною мовою (EN/UK). Під кожною назвою показано конфігурацію ліжок." },
      ],
    },
  },

  bookings: {
    en: {
      title: "Bookings",
      blocks: [
        { type: "paragraph", text: "The Bookings section lists all active reservations. Cards are sorted by check-in date and can be filtered by status." },
        { type: "subheading", text: "Statuses" },
        { type: "list", items: [
          "PENDING — submitted via website, awaits admin review",
          "CONFIRMED — admin approved, deposit may be collected",
          "CHECK_IN — guest has arrived",
          "CHECK_OUT — guest has departed",
          "CANCELLED — reservation cancelled",
        ]},
        { type: "subheading", text: "Key actions" },
        { type: "list", items: [
          "Confirm a pending booking → status becomes CONFIRMED",
          "Register arrival → status becomes CHECK_IN",
          "Register departure → status becomes CHECK_OUT (tourist tax is frozen at this point)",
          "Add internal notes (visible only to staff)",
          "Download guest registration form as a .docx Word document",
          "Assign / reassign to another admin",
        ]},
        { type: "subheading", text: "Handler indicator" },
        { type: "paragraph", text: "Each card shows a 'Processed by' badge with the admin's name who last actioned the booking." },
        { type: "tip", text: "Tourist tax is automatically calculated based on the number of nights × rate × guests. Once status reaches CHECK_IN, the amount is frozen and no longer recalculates." },
        { type: "warning", text: "Early check-in and late check-out fees must be entered manually in the booking edit dialog." },
      ],
    },
    uk: {
      title: "Бронювання",
      blocks: [
        { type: "paragraph", text: "Розділ Бронювання містить усі активні резервації. Картки відсортовані за датою заїзду і можуть фільтруватися за статусом." },
        { type: "subheading", text: "Статуси" },
        { type: "list", items: [
          "ОЧІКУЄ — подано через сайт, очікує розгляду адміном",
          "ПІДТВЕРДЖЕНО — адмін схвалив, можливий збір депозиту",
          "ЗАЇЗД — гість прибув",
          "ВИЇЗД — гість виїхав",
          "СКАСОВАНО — бронювання скасовано",
        ]},
        { type: "subheading", text: "Основні дії" },
        { type: "list", items: [
          "Підтвердити запит → статус стає ПІДТВЕРДЖЕНО",
          "Зареєструвати заїзд → статус стає ЗАЇЗД",
          "Зареєструвати виїзд → статус стає ВИЇЗД (туристичний збір фіксується)",
          "Додати внутрішні нотатки (видно лише персоналу)",
          "Завантажити гостьову реєстраційну картку у форматі .docx Word",
          "Призначити / перепризначити іншому адміну",
        ]},
        { type: "subheading", text: "Індикатор відповідального" },
        { type: "paragraph", text: "На кожній картці відображається значок «Обробив» з ім'ям адміна, який останній виконав дію з бронюванням." },
        { type: "tip", text: "Туристичний збір розраховується автоматично: кількість ночей × ставка × кількість гостей. Після переходу до статусу ЗАЇЗД сума фіксується і більше не перераховується." },
        { type: "warning", text: "Збори за ранній заїзд та пізній виїзд вводяться вручну у діалозі редагування бронювання." },
      ],
    },
  },

  rooms: {
    en: {
      title: "Rooms & Room Units",
      blocks: [
        { type: "paragraph", text: "Room types define the category (e.g. Standard, Suite) with pricing, descriptions and photos. Room units are the individual physical rooms linked to a type." },
        { type: "subheading", text: "Room Types" },
        { type: "list", items: [
          "Set base price per night",
          "Ukrainian translation for name and description",
          "Add/remove photos via gallery",
          "Mark as active or inactive",
        ]},
        { type: "subheading", text: "Room Units (Calendar → Room Units section)" },
        { type: "list", items: [
          "Each unit has a room number and is linked to a type",
          "Bed configuration: Single, Double, Double + Sofa, Twin (2×single), Triple, Quad, etc.",
          "Deactivate a unit to hide it from the booking calendar",
        ]},
        { type: "tip", text: "Room type names and descriptions are shown in Ukrainian on the website and calendar when the language is set to UK." },
      ],
    },
    uk: {
      title: "Номери та одиниці номерів",
      blocks: [
        { type: "paragraph", text: "Типи номерів визначають категорію (наприклад, Стандарт, Люкс) з ціною, описами та фото. Одиниці номерів — це окремі фізичні кімнати, прив'язані до типу." },
        { type: "subheading", text: "Типи номерів" },
        { type: "list", items: [
          "Встановіть базову ціну за ніч",
          "Переклад назви та опису українською",
          "Додавайте/видаляйте фото через галерею",
          "Позначте як активний або неактивний",
        ]},
        { type: "subheading", text: "Одиниці номерів (Календар → розділ Одиниці номерів)" },
        { type: "list", items: [
          "Кожна одиниця має номер кімнати і прив'язана до типу",
          "Конфігурація ліжок: односпальне, двоспальне, двоспальне + диван, Twin (2×одинарне), потрійне, чотиримісне тощо",
          "Деактивуйте одиницю, щоб приховати її у календарі бронювань",
        ]},
        { type: "tip", text: "Назви та описи типів номерів відображаються українською на сайті та у календарі, якщо вибрана мова УК." },
      ],
    },
  },

  users: {
    en: {
      title: "Users",
      blocks: [
        { type: "paragraph", text: "The Users section is accessible to Super Admins and Owners. It shows all staff accounts with their roles." },
        { type: "subheading", text: "Adding a new user" },
        { type: "list", items: [
          "The new user must first register on the admin login page (or via Supabase Auth dashboard)",
          "Once registered, find the user here and assign their role",
          "Alternatively, use the 'Grant Role' button — enter the user's email and select a role",
        ]},
        { type: "subheading", text: "Changing a role" },
        { type: "list", items: [
          "Find the user in the list",
          "Click the role selector next to their name",
          "Select the new role — the change takes effect immediately",
        ]},
        { type: "warning", text: "Owners can assign any role including Super Admin. Be careful when granting elevated privileges." },
        { type: "tip", text: "Commission rates (manual booking % and site/AI booking %) can be set per user and are used in revenue reports." },
      ],
    },
    uk: {
      title: "Користувачі",
      blocks: [
        { type: "paragraph", text: "Розділ Користувачі доступний Супер-адмінам і Власникам. Він показує всі акаунти персоналу з їх ролями." },
        { type: "subheading", text: "Додавання нового користувача" },
        { type: "list", items: [
          "Новий користувач спочатку має зареєструватися на сторінці входу в адмін (або через Supabase Auth)",
          "Після реєстрації знайдіть користувача тут і призначте йому роль",
          "Або скористайтеся кнопкою «Надати роль» — введіть email користувача та виберіть роль",
        ]},
        { type: "subheading", text: "Зміна ролі" },
        { type: "list", items: [
          "Знайдіть користувача у списку",
          "Клацніть на вибір ролі поруч із його ім'ям",
          "Виберіть нову роль — зміна набирає сили негайно",
        ]},
        { type: "warning", text: "Власники можуть призначати будь-яку роль, включно з Супер-адміном. Будьте обережні, надаючи підвищені права." },
        { type: "tip", text: "Ставки комісії (% ручного бронювання та % сайту/AI) встановлюються для кожного користувача і використовуються у звітах про доходи." },
      ],
    },
  },

  settings: {
    en: {
      title: "Settings",
      blocks: [
        { type: "paragraph", text: "Hotel-wide configuration managed by Admins and Owners." },
        { type: "list", items: [
          "Tourist tax rate (%) — applied per person per night",
          "Total capacity — maximum number of guests (shown in Owner Dashboard progress bar)",
          "Hotel name and contact details",
          "Check-in / check-out times (informational)",
        ]},
        { type: "tip", text: "Changes to the tourist tax rate affect only future calculations. Existing bookings that have reached CHECK_IN status have their tax amount frozen." },
      ],
    },
    uk: {
      title: "Налаштування",
      blocks: [
        { type: "paragraph", text: "Загальні параметри готелю, якими керують Адміни та Власник." },
        { type: "list", items: [
          "Ставка туристичного збору (%) — застосовується на особу за ніч",
          "Загальна місткість — максимальна кількість гостей (відображається у прогрес-барі панелі Власника)",
          "Назва та контактні дані готелю",
          "Час заїзду / виїзду (інформаційно)",
        ]},
        { type: "tip", text: "Зміни ставки туристичного збору впливають лише на майбутні розрахунки. Для бронювань, що вже досягли статусу ЗАЇЗД, сума зборів зафіксована." },
      ],
    },
  },

  analytics: {
    en: {
      title: "Analytics (Owner only)",
      blocks: [
        { type: "paragraph", text: "The Analytics section is exclusive to Owners. It provides hospitality-industry KPIs for the selected period." },
        { type: "subheading", text: "Period options" },
        { type: "list", items: [
          "This month",
          "Last month",
          "Last 6 months (default)",
          "This year",
        ]},
        { type: "subheading", text: "Metrics explained" },
        { type: "list", items: [
          "Occupancy Rate — % of rooms occupied in the period",
          "ADR — Average Daily Rate (room revenue ÷ rooms sold)",
          "RevPAR — Revenue Per Available Room (ADR × occupancy)",
          "TRevPAR — Total RevPAR including fees & taxes",
          "ALOS — Average Length of Stay",
          "Total Revenue — all income: room + tax + early/late fees",
          "Prepayments — deposits collected",
          "Bookings count",
        ]},
        { type: "tip", text: "Hover the ℹ icon on any KPI card to see the full formula and explanation." },
        { type: "subheading", text: "Charts" },
        { type: "list", items: [
          "Revenue by Month — bar chart of room revenue",
          "Occupancy Trend — line chart of monthly occupancy %",
          "Channel Mix — pie chart showing booking sources (SITE, ADMIN, AI)",
          "Bookings by Month — bar chart of reservation count",
        ]},
        { type: "subheading", text: "Metrics Reference table" },
        { type: "paragraph", text: "At the bottom, all KPI formulas are listed with their exact computed values for the selected period." },
      ],
    },
    uk: {
      title: "Аналітика (лише Власник)",
      blocks: [
        { type: "paragraph", text: "Розділ Аналітика доступний лише Власнику. Відображає ключові показники ефективності готельної індустрії за вибраний період." },
        { type: "subheading", text: "Варіанти періоду" },
        { type: "list", items: [
          "Цей місяць",
          "Минулий місяць",
          "Останні 6 місяців (за замовчуванням)",
          "Цей рік",
        ]},
        { type: "subheading", text: "Розшифровка метрик" },
        { type: "list", items: [
          "Occupancy Rate — % зайнятих номерів за період",
          "ADR — Середній денний тариф (дохід від номерів ÷ продано номерів)",
          "RevPAR — Дохід на доступний номер (ADR × завантаженість)",
          "TRevPAR — Загальний RevPAR, включно зі зборами та податками",
          "ALOS — Середня тривалість перебування",
          "Загальний дохід — всі надходження: номер + збір + ранній/пізній заїзд",
          "Передоплати — зібрані депозити",
          "Кількість бронювань",
        ]},
        { type: "tip", text: "Наведіть на значок ℹ на будь-якій картці показника, щоб побачити повну формулу та пояснення." },
        { type: "subheading", text: "Графіки" },
        { type: "list", items: [
          "Дохід за місяць — стовпчаста діаграма доходу від номерів",
          "Динаміка завантаженості — лінійний графік місячного % завантаженості",
          "Канали продажів — кругова діаграма за джерелами (SITE, ADMIN, AI)",
          "Бронювань за місяць — стовпчаста діаграма кількості резервацій",
        ]},
        { type: "subheading", text: "Довідник показників" },
        { type: "paragraph", text: "Внизу наведено всі формули KPI з точно обчисленими значеннями для вибраного періоду." },
      ],
    },
  },

  archive: {
    en: {
      title: "Archive",
      blocks: [
        { type: "paragraph", text: "The Archive stores completed and cancelled reservations that are older than the current operational period." },
        { type: "list", items: [
          "Searchable by guest name, room, or dates",
          "Read-only — archived records cannot be modified",
          "Download guest forms from archived bookings",
        ]},
        { type: "tip", text: "Use the Archive to look up a returning guest's previous stays or to resolve payment disputes." },
      ],
    },
    uk: {
      title: "Архів",
      blocks: [
        { type: "paragraph", text: "Архів містить завершені та скасовані бронювання, старші за поточний операційний період." },
        { type: "list", items: [
          "Пошук за іменем гостя, номером або датами",
          "Лише читання — архівні записи не можна змінювати",
          "Завантаження гостьових форм з архівних бронювань",
        ]},
        { type: "tip", text: "Архів допомагає знайти попередні перебування постійного гостя або вирішити платіжні суперечки." },
      ],
    },
  },
};

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderBlock(block: GuideBlock, idx: number) {
  switch (block.type) {
    case "paragraph":
      return <p key={idx} className="text-sm text-foreground/80 leading-relaxed">{block.text}</p>;

    case "subheading":
      return <h3 key={idx} className="text-sm font-semibold text-foreground mt-3 mb-1">{block.text}</h3>;

    case "list":
      return (
        <ul key={idx} className="space-y-1 ml-1">
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <ChevronRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "tip":
      return (
        <div key={idx} className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{block.text}</p>
        </div>
      );

    case "warning":
      return (
        <div key={idx} className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{block.text}</p>
        </div>
      );

    default:
      return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminGuide() {
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const content = CONTENT[activeSection][language];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {t("guide.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("guide.subtitle")}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Sidebar nav ──────────────────────────────────────────────────── */}
        <aside className="lg:w-52 flex-shrink-0">
          <nav className="flex flex-wrap lg:flex-col gap-1">
            {SECTIONS.map(({ id, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full",
                  activeSection === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", activeSection === id ? "text-primary-foreground" : color)} />
                <span className="truncate">{t(`guide.section.${id}` as any)}</span>
                {activeSection === id && <CheckCircle className="h-3.5 w-3.5 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{content.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {content.blocks.map((block, idx) => renderBlock(block, idx))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
