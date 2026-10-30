/**
 * Single source of truth for all portfolio content.
 * Every user-visible string is bilingual: { en, vi }.
 * Sections/components import from here — never hardcode copy.
 */

export type Lang = "en" | "vi";
export type L<T = string> = Record<Lang, T>;

export const profile = {
  name: "Nguyễn Mạnh Đức",
  shortName: "Đức",
  handle: "ducnolag",
  roles: {
    en: ["Business Analyst", "AI Engineer", "Full-stack Builder"],
    vi: ["Business Analyst", "AI Engineer", "Full-stack Builder"],
  } as L<string[]>,
  tagline: {
    en: "I turn messy ideas into products people actually use.",
    vi: "Mình biến những ý tưởng ngổn ngang thành sản phẩm người ta thực sự dùng.",
  } as L,
  intro: {
    en: [
      "I'm always hunting for new ideas, learning relentlessly, and pushing myself further. I love turning ideas into real products through creativity, logical thinking, and a growth mindset.",
      "To me, every project is a chance to explore new possibilities, sharpen my skills, and create something meaningful. Good products don't just solve problems. They leave a memorable experience.",
      "This is where I share the journey: the projects, the experiments, and the ideas I'm still building.",
    ],
    vi: [
      "Mình là người luôn tìm kiếm những ý tưởng mới, không ngừng học hỏi và phát triển bản thân. Mình yêu thích việc biến những ý tưởng thành sản phẩm thực tế thông qua sự sáng tạo, tư duy logic và tinh thần cầu tiến.",
      "Với mình, mỗi dự án là một cơ hội để khám phá những khả năng mới, trau dồi kỹ năng và tạo ra những giá trị có ý nghĩa. Sản phẩm tốt không chỉ giải quyết vấn đề mà còn mang lại trải nghiệm đáng nhớ.",
      "Đây là nơi mình chia sẻ hành trình, những dự án và những ý tưởng mà mình đã và đang phát triển.",
    ],
  } as L<string[]>,
  location: { en: "Hanoi, Vietnam", vi: "Hà Nội, Việt Nam" } as L,
  email: "duchaiphong97@gmail.com",
  links: {
    github: "https://github.com/ducnolag",
    linkedin:
      "https://www.linkedin.com/in/m%E1%BA%A1nh-%C4%91%E1%BB%A9c-nguy%E1%BB%85n-6aa8b832a/",
  },
  /** Downloadable résumé (public/cv). */
  cv: { href: "/cv/Nguyen-Manh-Duc-CV.pdf", filename: "Nguyen-Manh-Duc-CV.pdf" },
  photos: {
    campus: {
      src: "/images/duc-campus.jpg", w: 200, h: 200,
      alt: { en: "Đức sitting on a campus bench", vi: "Đức ngồi trên ghế đá sân trường" },
      caption: { en: "Campus, between classes", vi: "Sân trường, giữa hai tiết học" },
    },
    sunset: {
      src: "/images/duc-sunset.jpg", w: 761, h: 960,
      alt: { en: "Đức at the beach at sunset", vi: "Đức trên bãi biển lúc hoàng hôn" },
      caption: { en: "Golden hour, somewhere on the coast", vi: "Giờ vàng, một bờ biển nào đó" },
    },
    mirror: {
      src: "/images/duc-mirror.jpg", w: 1600, h: 1600,
      alt: { en: "Đức taking a mirror selfie with headphones", vi: "Đức chụp gương với tai nghe" },
      caption: { en: "Home desk, where most things get built", vi: "Góc phòng, nơi phần lớn mọi thứ được dựng" },
    },
    hackathon: {
      src: "/images/duc-hackathon.jpg", w: 1800, h: 1200,
      alt: { en: "Hackathon team working on laptops in a lecture hall", vi: "Đội thi hackathon làm việc trên laptop trong hội trường" },
      caption: { en: "Hackathon day, Banking Academy of Vietnam", vi: "Ngày thi hackathon, Học viện Ngân hàng" },
    },
    presenting: {
      src: "/images/duc-presenting.jpg", w: 1800, h: 1200,
      alt: { en: "Presenting a project at the Banking Academy of Vietnam", vi: "Thuyết trình dự án tại Học viện Ngân hàng" },
      caption: { en: "Pitching SV5T to the jury", vi: "Trình bày SV5T trước ban giám khảo" },
    },
  },
} as const;

/** Ordered set for the About "prints on a wall" and any gallery row. */
export const gallery = [
  profile.photos.mirror,
  profile.photos.presenting,
  profile.photos.hackathon,
  profile.photos.campus,
] as const;

/* ────────────────────────────────────────────────────────────
   Projects. Only what Đức asked to show. Private repos have no `repo`,
   only a `demo`. `cover` is a real screenshot in public/images/projects
   when a live site exists; otherwise the card draws a generated cover.
   ──────────────────────────────────────────────────────────── */
export type Project = {
  slug: string;
  title: string;
  tagline: L;
  description: L;
  highlights: L<string[]>;
  stack: string[];
  category: "ai" | "web" | "data" | "system" | "mobile";
  /** Public repository, if any. */
  repo?: string;
  /** Live site / build link, if any. */
  demo?: string;
  /** Short label for the demo link, e.g. "Live demo", "UI preview", "Expo build". */
  demoKind?: "live" | "ui-only" | "build";
  /** Role / team context line (from the CV). */
  role?: L;
  /** What Lag (the robot guide) says about it, in its own voice. 1–2 short sentences. */
  lagSays: L;
  /** Screenshot cover (1200×750) or undefined → generated cover. */
  cover?: string;
  year: number;
  featured: boolean;
  /** Accent token name used by the card. */
  accent: "violet" | "electric" | "magenta" | "orchid";
  /** Visibility note shown as a small tag. */
  visibility: "public" | "private";
};

export const projects: Project[] = [
  {
    slug: "noodles",
    title: "Tiệm Ăn Vặt",
    tagline: {
      en: "A playful storefront for a mixed-noodle shop.",
      vi: "Trang bán hàng vui nhộn cho một tiệm mì trộn.",
    },
    description: {
      en: "Final-term front-end project: product catalogue, cart and checkout flow built with vanilla JavaScript, HTML and CSS. No framework, all hand-rolled.",
      vi: "Bài tập cuối kỳ front-end: danh mục sản phẩm, giỏ hàng và luồng thanh toán bằng JavaScript, HTML và CSS thuần. Không framework, tự tay dựng toàn bộ.",
    },
    highlights: {
      en: ["Vanilla JS state & cart", "Responsive CSS layout", "Course capstone"],
      vi: ["State & giỏ hàng JS thuần", "Layout CSS responsive", "Đồ án môn học"],
    },
    stack: ["JavaScript", "HTML", "CSS"],
    category: "web",
    lagSays: {
      en: "Đức's first project. The one that started his habit of learning and tinkering.",
      vi: "Dự án đầu tiên của Đức. Cái đã khởi đầu cho hành trình học hỏi và tìm tòi của cậu ấy.",
    },
    repo: "https://github.com/ducnolag/Websitez-Buy_Noodles-FE",
    demo: "https://tiem-an-vat-ngon-nhat-the-gioi.netlify.app/",
    demoKind: "live",
    cover: "/images/projects/noodles.jpg",
    year: 2025,
    featured: false,
    accent: "orchid",
    visibility: "public",
  },
  {
    slug: "toolify",
    title: "Toolify for Everyone",
    tagline: {
      en: "A hub matching real-world needs with the right AI tool.",
      vi: "Nơi kết nối nhu cầu thực tế với công cụ AI phù hợp.",
    },
    description: {
      en: "A multi-tool AI platform for Vietnamese students, founders, freelancers and small businesses. Each tool solves one concrete problem on shared infrastructure (auth, database, domain) and runs in demo mode even without API keys: PDF translation, AI-provenance watermark removal, smart price comparison and more.",
      vi: "Nền tảng đa công cụ AI cho sinh viên, founder, freelancer và doanh nghiệp nhỏ Việt Nam. Mỗi tool giải quyết một vấn đề cụ thể trên hạ tầng dùng chung (xác thực, cơ sở dữ liệu, domain) và chạy được ở demo mode ngay cả khi chưa có API key: dịch PDF, xoá watermark AI, so sánh giá thông minh và hơn thế.",
    },
    highlights: {
      en: ["Next.js web + Python agent runner", "Gemini-powered page-by-page PDF translation", "Dockerised, demo-mode first"],
      vi: ["Web Next.js + Python agent runner", "Dịch PDF từng trang bằng Gemini", "Docker hoá, ưu tiên demo-mode"],
    },
    stack: ["Next.js", "TypeScript", "Python", "Gemini API", "Docker"],
    category: "ai",
    lagSays: {
      en: "Đức's biggest build so far. One roof, many small AI tools.",
      vi: "Dự án lớn nhất của Đức tới giờ. Một mái nhà, nhiều tool AI nhỏ.",
    },
    repo: "https://github.com/ducnolag/ToolifyForEveryone",
    year: 2026,
    featured: true,
    accent: "violet",
    visibility: "public",
  },
  {
    slug: "sv5t",
    title: "SV5T · Sinh viên 5 Tốt",
    tagline: {
      en: "Digitising the 3-tier “Student of Five Merits” review, end to end.",
      vi: "Số hoá toàn diện quy trình xét duyệt danh hiệu Sinh viên 5 Tốt qua 3 cấp.",
    },
    description: {
      en: "Students' evidence used to live in scattered files, and verifying it cost the Youth Union staff hours. This platform lets students manage and complete their evidence, see which criteria still fall short, and lets the Union review faster. Microservices in NestJS and React, PostgreSQL, 10 Docker containers behind an NGINX gateway.",
      vi: "Minh chứng của sinh viên vốn rời rạc, và việc kiểm tra tính chính xác bên phía cán bộ Hội rất mất thời gian. Hệ thống giúp sinh viên quản lý, bổ sung minh chứng, biết tiêu chí nào chưa phù hợp, và giúp Hội rút ngắn thời gian xử lý. Microservices NestJS + React, PostgreSQL, 10 Docker container sau NGINX gateway.",
    },
    highlights: {
      en: ["Team lead of 4, hackathon build", "AI OCR + VNPT eKYC for evidence checks", "NestJS 11 microservices + React 19; UI preview online, back end not hosted yet"],
      vi: ["Trưởng nhóm 4 thành viên, dự án hackathon", "AI OCR + VNPT eKYC để kiểm tra minh chứng", "Microservices NestJS 11 + React 19; giao diện đã online, backend chưa host"],
    },
    stack: ["NestJS", "React", "PostgreSQL", "Docker", "NGINX"],
    category: "web",
    lagSays: {
      en: "He led four people through a hackathon for this one. (Front end only, for now.)",
      vi: "Vụ này Đức dẫn bốn người qua một kỳ hackathon. (Hiện chỉ hỗ trợ FE.)",
    },
    repo: "https://github.com/ducnolag/SV5T",
    demo: "https://xet-duyet-sv5t.netlify.app/login",
    demoKind: "ui-only",
    role: { en: "Team lead · 4 members", vi: "Trưởng nhóm · 4 thành viên" },
    cover: "/images/projects/sv5t.jpg",
    year: 2026,
    featured: true,
    accent: "electric",
    visibility: "public",
  },
  {
    slug: "misher",
    title: "MISHER",
    tagline: {
      en: "An AI voice assistant app built for older adults.",
      vi: "Ứng dụng trợ lý AI bằng giọng nói dành cho người cao tuổi.",
    },
    description: {
      en: "A mobile assistant that older people can simply talk to: voice-first interaction, large readable screens and plain-language answers, so technology helps instead of intimidating. Built with React Native on Expo; the source stays private, the build is open to try.",
      vi: "Ứng dụng di động mà người lớn tuổi chỉ cần nói chuyện: tương tác bằng giọng nói, màn hình chữ to dễ đọc, câu trả lời dễ hiểu, để công nghệ giúp đỡ thay vì làm họ e ngại. Dựng bằng React Native trên Expo; mã nguồn để riêng tư, bản build mở để dùng thử.",
    },
    highlights: {
      en: ["Voice-first mobile UX", "React Native + Expo build", "Designed for low-vision, low-tech users"],
      vi: ["Trải nghiệm di động ưu tiên giọng nói", "React Native + bản build Expo", "Thiết kế cho người mắt kém, ít dùng công nghệ"],
    },
    stack: ["React Native", "Expo", "JavaScript", "Speech & LLM APIs"],
    category: "mobile",
    lagSays: {
      en: "My favourite. A voice assistant for grandparents, so they can just talk to their phone.",
      vi: "Mình thích cái này nhất. Trợ lý giọng nói cho ông bà, chỉ cần nói chuyện với điện thoại.",
    },
    demo: "https://expo.dev/accounts/duclagdz23/projects/voice-assistant-mobile/builds/31cdbd34-cbe2-469c-9891-0d1e1a57cf35",
    demoKind: "build",
    year: 2026,
    featured: true,
    accent: "magenta",
    visibility: "private",
  },
  {
    slug: "lab-manager",
    title: "Lab Room Manager",
    tagline: {
      en: "Managing university computer labs without spreadsheets and Zalo threads.",
      vi: "Quản lý phòng máy thực hành không còn qua sheet và tin nhắn Zalo.",
    },
    description: {
      en: "Lecturers used to book practice labs by email or Zalo and staff tracked everything by hand in sheets. This system schedules rooms, tracks machines and sessions, and logs incidents in one place. C# desktop client on a SQL Server back end.",
      vi: "Giảng viên mượn phòng qua mail, Zalo; cán bộ quản lý thủ công bằng sheet, rất mất thời gian. Hệ thống đặt lịch phòng, theo dõi máy và ca thực hành, ghi nhận sự cố ở một nơi. Client desktop C# trên nền SQL Server.",
    },
    highlights: {
      en: ["Team lead of 4", "C# client, T-SQL procedures", "Role-based booking workflow"],
      vi: ["Trưởng nhóm 4 thành viên", "Client C#, procedure T-SQL", "Luồng đặt phòng theo vai trò"],
    },
    stack: ["C#", ".NET", "SQL Server", "T-SQL"],
    category: "system",
    lagSays: {
      en: "Before this, booking a computer lab meant emails and Zalo messages. Now it's one system.",
      vi: "Trước đó mượn phòng máy là mail với tin nhắn Zalo. Giờ là một hệ thống.",
    },
    repo: "https://github.com/ducnolag/QL_Phong_May_Thuc_Hanh",
    role: { en: "Team lead · 4 members", vi: "Trưởng nhóm · 4 thành viên" },
    year: 2026,
    featured: false,
    accent: "orchid",
    visibility: "public",
  },
  {
    slug: "data-to-decision",
    title: "Data → Decision Making",
    tagline: {
      en: "From raw data to decisions. Champion, Data To Decision Making 2025–2026.",
      vi: "Từ dữ liệu đến ra quyết định. Quán quân cuộc thi Data To Decision Making 2025–2026.",
    },
    description: {
      en: "The competition entry that won first place: exploratory analysis in Python turned into decision-ready dashboards and a narrative a non-technical jury could act on, exported as interactive HTML reports.",
      vi: "Bài dự thi giành giải nhất: phân tích khám phá bằng Python, biến thành dashboard và câu chuyện mà ban giám khảo không chuyên kỹ thuật cũng ra quyết định được, xuất dưới dạng báo cáo HTML tương tác.",
    },
    highlights: {
      en: ["1st place, Data To Decision Making", "Exploratory analysis in Python", "Interactive HTML reports"],
      vi: ["Giải nhất Data To Decision Making", "Phân tích khám phá bằng Python", "Báo cáo HTML tương tác"],
    },
    stack: ["Python", "pandas", "Plotly", "HTML"],
    category: "data",
    lagSays: {
      en: "This one won first place. Data in, decisions out, and a jury that nodded.",
      vi: "Cái này giành giải nhất. Dữ liệu vào, quyết định ra, giám khảo gật đầu.",
    },
    repo: "https://github.com/ducnolag/Data_To_Decision_Making",
    year: 2026,
    featured: false,
    accent: "electric",
    visibility: "public",
  },
  {
    slug: "minigame",
    title: "Minigame",
    tagline: {
      en: "“Vượt Ải”: a timed quiz-and-code gauntlet for the IT club.",
      vi: "“Vượt Ải”: thử thách đố vui và code có tính giờ cho CLB CNTT.",
    },
    description: {
      en: "A browser game for the IT club's technical rounds: four stages, each monster is a question, the final boss is a coding task you can resubmit for your best score, all inside a 35-minute clock. Contestants enter a round code and play straight from a link.",
      vi: "Game trên trình duyệt cho vòng kỹ thuật của CLB CNTT: bốn ải, mỗi quái là một câu hỏi, boss cuối là bài code nộp nhiều lần lấy điểm cao nhất, tất cả trong 35 phút. Thí sinh nhập mã đợt thi và chơi ngay từ link.",
    },
    highlights: {
      en: ["4 stages, 35-minute clock, scoring rules", "Coding boss with resubmission", "TypeScript, live on Vercel"],
      vi: ["4 ải, đồng hồ 35 phút, luật tính điểm", "Boss code nộp nhiều lần", "TypeScript, chạy trên Vercel"],
    },
    stack: ["TypeScript", "Vercel"],
    category: "web",
    lagSays: {
      en: "Bored of plain multiple-choice test forms? He made a game that's fun and still teaches.",
      vi: "Quá nhàm chán với những form trắc nghiệm bài test thông thường, hãy làm ngay một game giải trí mà vẫn có thể học tập.",
    },
    demo: "https://bit-minigametest.vercel.app/",
    demoKind: "live",
    cover: "/images/projects/minigame.jpg",
    year: 2026,
    featured: false,
    accent: "violet",
    visibility: "private",
  },
  {
    slug: "sendmail",
    title: "Tool Gửi Mail",
    tagline: {
      en: "Send one message to many people, personalised, in a minute.",
      vi: "Gửi một nội dung tới nhiều người, cá nhân hoá, trong một phút.",
    },
    description: {
      en: "A small web tool for bulk, personalised email: paste a recipient list, write once, send to everyone. Built in JavaScript for club and class communication.",
      vi: "Công cụ web nhỏ để gửi email hàng loạt có cá nhân hoá: dán danh sách người nhận, viết một lần, gửi cho tất cả. Viết bằng JavaScript phục vụ liên lạc câu lạc bộ và lớp.",
    },
    highlights: {
      en: ["Bulk send with per-recipient fields", "JavaScript", "Live on Netlify"],
      vi: ["Gửi hàng loạt với trường theo từng người", "JavaScript", "Đang chạy trên Netlify"],
    },
    stack: ["JavaScript", "Netlify"],
    category: "web",
    lagSays: {
      en: "Write once, send to everyone, each name filled in. Small tool, saves whole evenings.",
      vi: "Viết một lần, gửi cho tất cả, tên ai điền nấy. Tool nhỏ, tiết kiệm cả buổi tối.",
    },
    demo: "https://sendmailmanypeople.netlify.app/",
    demoKind: "live",
    year: 2026,
    featured: false,
    accent: "magenta",
    visibility: "private",
  },
];

/** Tech words used by the hero's floating glyphs (not the résumé section). */
export const skills: { group: L; items: string[] }[] = [
  { group: { en: "AI & Data", vi: "AI & Dữ liệu" }, items: ["Python", "pandas", "Gemini API", "LLM agents"] },
  { group: { en: "Web", vi: "Web" }, items: ["TypeScript", "Next.js", "React", "NestJS", "Three.js"] },
  { group: { en: "Systems", vi: "Hệ thống" }, items: ["PostgreSQL", "SQL Server", "Docker", "C# / .NET"] },
  { group: { en: "Business Analysis", vi: "Phân tích nghiệp vụ" }, items: ["BRD / SRS", "BPMN", "Figma", "User Story"] },
];

/* ────────────────────────────────────────────────────────────
   Résumé, as written in the CV (Oct 2026). This drives the Skills section.
   ──────────────────────────────────────────────────────────── */
export const resume = {
  headline: { en: "Business Analyst in the making", vi: "Business Analyst đang trên đường" } as L,
  education: {
    school: { en: "Banking Academy of Vietnam", vi: "Học viện Ngân hàng" } as L,
    faculty: { en: "Faculty of Information Technology & Digital Economics", vi: "Khoa Công nghệ thông tin & Kinh tế số" } as L,
    degree: { en: "BSc, Management Information Systems", vi: "Cử nhân Hệ thống thông tin quản lý" } as L,
    period: "2024 – 2028",
    gpa: "3.85 / 4.0",
  },
  experience: [
    {
      company: "AI For Vietnam Co., Ltd",
      role: { en: "Data Annotator", vi: "Annotator" } as L,
      period: "11/2025 – 04/2026",
      summary: {
        en: "Labelled training data and learned how models read it; handled safety labelling for harmful and jailbreak cases.",
        vi: "Gán nhãn dữ liệu, hiểu logic dữ liệu mà máy hiểu; xử lý gán nhãn các trường hợp nguy hiểm, vi phạm đạo đức (jailbreak).",
      } as L,
    },
  ],
  skillGroups: [
    {
      group: { en: "Business analysis", vi: "Kỹ năng chuyên môn" } as L,
      items: {
        en: [
          "Gathering, analysing and clarifying business requirements; writing BRD, SRS, user stories and use cases",
          "Modelling and standardising business processes with BPMN",
          "Wireframes and functional flows in Figma, Draw.io and Bizagi",
          "Working knowledge of APIs and SQL to query data and check business logic",
        ],
        vi: [
          "Thu thập, phân tích và làm rõ yêu cầu nghiệp vụ; xây dựng BRD, SRS, User Story, Use Case",
          "Phân tích, mô hình hoá và chuẩn hoá quy trình nghiệp vụ bằng BPMN",
          "Xây dựng wireframe và luồng chức năng trên Figma, Draw.io, Bizagi",
          "Kiến thức cơ bản về API và SQL để truy vấn và kiểm tra logic nghiệp vụ trên cơ sở dữ liệu",
        ],
      } as L<string[]>,
    },
    {
      group: { en: "Applied AI", vi: "Ứng dụng AI" } as L,
      items: {
        en: [
          "Using AI assistants (Claude, ChatGPT…) to draft project documents faster and better",
          "Using AI tools to build prototypes, demos, wireframes and mock-ups that make requirements visible and shorten discussions",
        ],
        vi: [
          "Sử dụng AI (Claude, ChatGPT,…) để soạn thảo tài liệu dự án nhanh và hiệu quả hơn",
          "Dùng công cụ AI dựng prototype/demo, wireframe và mockup để trực quan hoá yêu cầu, rút ngắn trao đổi",
        ],
      } as L<string[]>,
    },
    {
      group: { en: "Office tools", vi: "Tin học" } as L,
      items: {
        en: ["Proficient in Word, Excel, PowerPoint and Canva for documents and reports"],
        vi: ["Thành thạo Word, Excel, PowerPoint, Canva phục vụ soạn thảo tài liệu và báo cáo"],
      } as L<string[]>,
    },
    {
      group: { en: "Soft skills", vi: "Kỹ năng mềm" } as L,
      items: {
        en: [
          "Analytical, logical thinking and the habit of clarifying the problem; communicates well with many stakeholders",
          "Responsible and careful with requirements and documents; adapts quickly to a new project environment",
        ],
        vi: [
          "Tư duy phân tích, logic và khả năng làm rõ vấn đề; giao tiếp hiệu quả với nhiều bên liên quan",
          "Có trách nhiệm và cẩn thận trong xử lý yêu cầu, tài liệu; thích nghi nhanh với môi trường dự án",
        ],
      } as L<string[]>,
    },
  ],
  certificates: [
    { name: { en: "MOS: Excel, Word, PowerPoint", vi: "MOS Excel, Word, PowerPoint" } as L, year: "2025" },
    { name: { en: "Introduction to CRM with HubSpot", vi: "Introduction to CRM with HubSpot" } as L, year: "2026" },
    { name: { en: "Gemini Certified Student", vi: "Gemini Certified Student" } as L, year: "2026" },
  ],
  awards: [
    { name: { en: "Champion, Data To Decision Making competition", vi: "Quán quân cuộc thi Data To Decision Making" } as L, year: "2025 – 2026" },
    { name: { en: "“Student of Five Merits” title, Academy level", vi: "Danh hiệu Sinh viên 5 tốt cấp Học viện" } as L, year: "2025 – 2026" },
    { name: { en: "Academic excellence scholarship, semester 2", vi: "Học bổng khuyến khích học tập xuất sắc kỳ 2" } as L, year: "2025 – 2026" },
    { name: { en: "Academic excellence scholarship, semester 1", vi: "Học bổng khuyến khích học tập xuất sắc kỳ 1" } as L, year: "2024 – 2025" },
  ],
} as const;

export const ui = {
  nav: {
    about: { en: "About", vi: "Giới thiệu" },
    projects: { en: "Projects", vi: "Dự án" },
    skills: { en: "Résumé", vi: "Hồ sơ" },
    contact: { en: "Contact", vi: "Liên hệ" },
  },
  hero: {
    greeting: { en: "Hey, I'm", vi: "Xin chào, mình là" },
    scroll: { en: "Scroll", vi: "Cuộn xuống" },
    cta: { en: "See my work", vi: "Xem dự án" },
    ctaSecondary: { en: "Get in touch", vi: "Liên hệ" },
    hint: { en: "Grab the badge and throw it", vi: "Nắm lấy tấm thẻ và quăng thử" },
    badge: {
      title: { en: "ACCESS · ALL AREAS", vi: "ACCESS · ALL AREAS" },
      role: { en: "Business Analyst / AI Engineer", vi: "Business Analyst / AI Engineer" },
      since: { en: "Building since 2024", vi: "Xây dựng từ 2024" },
    },
  },
  /* Held scroll scenes: one line of text on every held screen (4–12 words). */
  scenes: {
    portrait: {
      en: ["Every pixel of this picture is a particle.", "Scroll, and the sunset falls into place.", "That's how I like to build: from noise to shape."],
      vi: ["Mỗi điểm ảnh trong bức này là một hạt.", "Cuộn xuống, hoàng hôn sẽ xếp vào đúng chỗ.", "Mình thích xây như vậy: từ nhiễu thành hình."],
    } as L<string[]>,
    companion: {
      /* One line per held screen. The guide is a TV-headed robot named "Lag" (from the handle ducnolag). */
      lines: {
        en: [
          "Meet Lag, my build companion. Don't let the name fool you.",
          "A bit chatty, but it knows everything about me. Go on, ask it.",
          "Scroll on. It'll show you around.",
        ],
        vi: [
          "Gặp Lag, bạn đồng hành của mình. Đừng để cái tên đánh lừa.",
          "Hơi nhiều chuyện, nhưng chuyện gì về mình nó cũng biết. Hỏi thử xem.",
          "Cuộn tiếp. Nó sẽ dẫn bạn đi một vòng.",
        ],
      } as L<string[]>,
      hint: { en: "Move your mouse. It's watching.", vi: "Di chuột thử. Nó đang nhìn đấy." },
      name: { en: "Lag", vi: "Lag" },
    },
  },
  about: {
    heading: { en: "About me", vi: "Về mình" },
    lagSays: {
      en: "This is Đức. I'll let him introduce himself.",
      vi: "Đây là Đức. Để cậu ấy tự giới thiệu nhé.",
    },
    statement: {
      en: "Good products don't just solve problems. They leave a memorable experience.",
      vi: "Sản phẩm tốt không chỉ giải quyết vấn đề. Nó để lại một trải nghiệm đáng nhớ.",
    },
    facts: {
      en: ["Based in Hanoi", "BA × AI × Full-stack", "Open to internships & collaborations"],
      vi: ["Sống tại Hà Nội", "BA × AI × Full-stack", "Sẵn sàng thực tập & hợp tác"],
    } as L<string[]>,
  },
  marquee: {
    en: "Ideas → products · Business Analyst · AI Engineer · Full-stack · ",
    vi: "Ý tưởng → sản phẩm · Business Analyst · AI Engineer · Full-stack · ",
  } as L,
  skills: {
    heading: { en: "Skills", vi: "Kỹ năng" },
    lede: {
      en: "The short version. The long one is in the CV.",
      vi: "Bản ngắn. Bản đầy đủ nằm trong CV.",
    },
    downloadCv: { en: "Download CV (PDF)", vi: "Tải CV (PDF)" },
    lagSays: {
      en: "Business analyst first, builder second. Ask me about any of these.",
      vi: "Business analyst trước, builder sau. Hỏi mình về mục nào cũng được.",
    },
  },
  projects: {
    heading: { en: "Selected work", vi: "Dự án tiêu biểu" },
    lede: {
      en: "Lag will walk you through them. Eight things I built or led.",
      vi: "Lag sẽ dẫn bạn đi một vòng. Tám sản phẩm mình đã làm hoặc dẫn dắt.",
    },
    intro: {
      en: "Okay, this is the part I like. Let me show you what he actually built.",
      vi: "Rồi, đến phần mình thích. Để mình cho bạn xem Đức đã dựng gì.",
    },
    outro: {
      en: "That's the tour. Ask me anything about these, or scroll on.",
      vi: "Hết tour rồi. Hỏi mình gì về mấy cái này cũng được, hoặc cuộn tiếp.",
    },
    viewRepo: { en: "Source on GitHub", vi: "Mã nguồn trên GitHub" },
    viewDemo: { en: "Open live site", vi: "Mở trang web" },
    viewUiOnly: { en: "Preview the UI (back end offline)", vi: "Xem giao diện (backend chưa chạy)" },
    viewBuild: { en: "Open the app build", vi: "Mở bản build ứng dụng" },
    privateTag: { en: "Private source", vi: "Mã riêng tư" },
    publicTag: { en: "Open source", vi: "Mã mở" },
    all: { en: "All", vi: "Tất cả" },
    filters: {
      ai: { en: "AI", vi: "AI" },
      web: { en: "Web", vi: "Web" },
      data: { en: "Data", vi: "Dữ liệu" },
      system: { en: "Systems", vi: "Hệ thống" },
      mobile: { en: "Mobile", vi: "Di động" },
    } as Record<Project["category"], L>,
    more: { en: "More on GitHub", vi: "Xem thêm trên GitHub" },
    dragHint: { en: "Drag sideways", vi: "Kéo ngang" },
    coverAlt: { en: "Screenshot of", vi: "Ảnh chụp màn hình" },
    lagName: { en: "Lag", vi: "Lag" },
  },
  chat: {
    open: { en: "Ask Lag", vi: "Hỏi Lag" },
    close: { en: "Close chat", vi: "Đóng chat" },
    title: { en: "Lag · Đức's build companion", vi: "Lag · bạn đồng hành của Đức" },
    placeholder: { en: "Ask about Đức, a project, or how to reach him…", vi: "Hỏi về Đức, một dự án, hay cách liên hệ…" },
    send: { en: "Send", vi: "Gửi" },
    greeting: {
      en: "Hi, I'm Lag. I know everything on this page. What do you want to know about Đức?",
      vi: "Chào, mình là Lag. Mình biết mọi thứ trên trang này. Bạn muốn biết gì về Đức?",
    },
    suggestions: {
      en: ["Who is Đức?", "What can he do as a BA?", "Tell me about SV5T", "How do I contact him?"],
      vi: ["Đức là ai?", "Đức làm được gì ở vai trò BA?", "Kể về SV5T đi", "Liên hệ Đức kiểu gì?"],
    } as L<string[]>,
    unknown: {
      en: "Hmm, that one's outside my screen. Try a project name, his skills, or how to reach him.",
      vi: "Ừm, cái đó nằm ngoài màn hình của mình. Thử hỏi tên dự án, kỹ năng, hoặc cách liên hệ nhé.",
    },
    thinking: { en: "Lag is thinking…", vi: "Lag đang nghĩ…" },
  },
  contact: {
    heading: { en: "Let's build something", vi: "Cùng làm gì đó nhé" },
    body: {
      en: "Have an idea, a role, or just want to talk products and AI? My inbox is open.",
      vi: "Có ý tưởng, một vị trí, hay chỉ muốn trò chuyện về sản phẩm và AI? Hộp thư của mình luôn mở.",
    },
    emailCta: { en: "Write to me", vi: "Viết thư cho mình" },
    emailSubject: { en: "Hello from your portfolio", vi: "Chào Đức, mình xem portfolio của bạn" },
    openGmail: { en: "Open in Gmail", vi: "Mở bằng Gmail" },
    openMailApp: { en: "Open mail app", vi: "Mở ứng dụng mail" },
    copy: { en: "Copy email", vi: "Sao chép email" },
    copied: { en: "Copied!", vi: "Đã sao chép!" },
    cv: { en: "Download CV", vi: "Tải CV" },
    cvNote: { en: "PDF · updated Oct 2026", vi: "PDF · cập nhật 10/2026" },
  },
  footer: {
    built: { en: "Built with Next.js, Three.js & too much coffee.", vi: "Dựng bằng Next.js, Three.js & rất nhiều cà phê." },
    rights: { en: "All rights reserved.", vi: "Bảo lưu mọi quyền." },
  },
  a11y: {
    toggleLang: { en: "Switch to Vietnamese", vi: "Chuyển sang tiếng Anh" },
    skip: { en: "Skip to content", vi: "Bỏ qua đến nội dung" },
    menu: { en: "Menu", vi: "Menu" },
    closeMenu: { en: "Close menu", vi: "Đóng menu" },
    motionOn: { en: "Motion on", vi: "Đang bật chuyển động" },
    motionOff: { en: "Motion reduced", vi: "Đã giảm chuyển động" },
    reduceMotion: { en: "Reduce motion", vi: "Giảm chuyển động" },
    enableMotion: { en: "Enable motion", vi: "Bật chuyển động" },
  },
} as const;
