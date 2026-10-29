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
  location: { en: "Vietnam", vi: "Việt Nam" } as L,
  email: "duchaiphong97@gmail.com",
  links: {
    github: "https://github.com/ducnolag",
    linkedin:
      "https://www.linkedin.com/in/m%E1%BA%A1nh-%C4%91%E1%BB%A9c-nguy%E1%BB%85n-6aa8b832a/",
  },
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


export type Project = {
  slug: string;
  title: string;
  tagline: L;
  description: L;
  highlights: L<string[]>;
  stack: string[];
  category: "ai" | "web" | "data" | "system";
  repo: string;
  demo?: string;
  year: number;
  featured: boolean;
  /** Accent used by the card's 3D object / glow (hex). */
  accent: string;
};

export const projects: Project[] = [
  {
    slug: "toolify",
    title: "Toolify",
    tagline: {
      en: "A hub matching real-world needs with the right AI tool.",
      vi: "Nơi kết nối nhu cầu thực tế với công cụ AI phù hợp.",
    },
    description: {
      en: "A multi-tool AI platform for Vietnamese students, founders, freelancers and SMBs. Each tool solves one concrete problem on shared infrastructure (auth, DB, domain) and runs in demo mode even without API keys: PDF translation, AI-provenance watermark removal, smart price comparison and more.",
      vi: "Nền tảng đa công cụ AI cho sinh viên, founder, freelancer và SMB Việt Nam. Mỗi tool giải quyết một vấn đề cụ thể trên hạ tầng dùng chung (xác thực, DB, domain) và chạy được ở demo mode ngay cả khi chưa có API key: dịch PDF, xoá watermark AI, so sánh giá thông minh và hơn thế.",
    },
    highlights: {
      en: ["Next.js 14 web + Python agent runner", "Gemini-powered page-by-page PDF translation", "Dockerised, demo-mode first"],
      vi: ["Web Next.js 14 + Python agent runner", "Dịch PDF từng trang bằng Gemini", "Docker hoá, ưu tiên demo-mode"],
    },
    stack: ["Next.js", "TypeScript", "Python", "Gemini API", "Docker"],
    category: "ai",
    repo: "https://github.com/ducnolag/Startup-BA",
    year: 2026,
    featured: true,
    accent: "#C6FF00",
  },
  {
    slug: "sv5t",
    title: "SV5T · Sinh viên 5 Tốt",
    tagline: {
      en: "Digitising a 3-tier student award review process end-to-end.",
      vi: "Số hoá toàn diện quy trình xét duyệt danh hiệu Sinh viên 5 Tốt qua 3 cấp.",
    },
    description: {
      en: "A microservices platform that digitises registration, evidence submission, appraisal and approval of the national “Sinh viên 5 Tốt” award across University → Province → Central levels. Packaged as 10 Docker containers behind an NGINX gateway, one command to boot.",
      vi: "Nền tảng microservices số hoá quy trình đăng ký, nộp minh chứng, thẩm định và phê duyệt danh hiệu “Sinh viên 5 Tốt” qua 3 cấp Trường → Tỉnh/Thành → Trung ương. Đóng gói 10 Docker container sau NGINX gateway, khởi chạy bằng một lệnh.",
    },
    highlights: {
      en: ["NestJS 11 microservices + React 19", "PostgreSQL 15, NGINX gateway", "10-container Docker Compose stack"],
      vi: ["Microservices NestJS 11 + React 19", "PostgreSQL 15, NGINX gateway", "Stack Docker Compose 10 container"],
    },
    stack: ["NestJS", "React", "PostgreSQL", "Docker", "NGINX"],
    category: "system",
    repo: "https://github.com/ducnolag/SV5T",
    year: 2026,
    featured: true,
    accent: "#00F0FF",
  },
  {
    slug: "banking-churn",
    title: "Banking Churn Classifier",
    tagline: {
      en: "Reproducing a 2025 paper on ensemble churn prediction.",
      vi: "Tái lập một bài báo 2025 về dự đoán khách hàng rời bỏ bằng ensemble.",
    },
    description: {
      en: "Faithful reproduction of Bhuria et al. (2025, Discover Sustainability): a hard-voting ensemble (DT / RF / KNN / SVC / XGBoost) on the 10k-row Kaggle bank churn dataset. Full data-quality pipeline, from identifier drop, one-hot and scaling to IQR outlier removal and SMOTE balancing, mapped section by section to the paper.",
      vi: "Tái lập trung thực nghiên cứu của Bhuria và cộng sự (2025, Discover Sustainability): ensemble hard-voting (DT / RF / KNN / SVC / XGBoost) trên bộ dữ liệu churn ngân hàng 10k dòng của Kaggle. Pipeline chất lượng dữ liệu đầy đủ, từ bỏ định danh, one-hot, scaling đến loại outlier IQR và cân bằng SMOTE, ánh xạ từng mục theo bài báo.",
    },
    highlights: {
      en: ["Scientific reproduction (student research)", "Voting classifier over 5 models", "Figures regenerated 1:1 with the paper"],
      vi: ["Tái lập nghiên cứu khoa học (NCKH)", "Voting classifier trên 5 mô hình", "Tái tạo biểu đồ 1:1 với bài báo"],
    },
    stack: ["Python", "scikit-learn", "XGBoost", "SMOTE", "pandas"],
    category: "data",
    repo: "https://github.com/ducnolag/Banking-Churn",
    year: 2026,
    featured: true,
    accent: "#FF2BD6",
  },
  {
    slug: "data-to-decision",
    title: "Data → Decision Making",
    tagline: {
      en: "From raw data to decisions, visually.",
      vi: "Từ dữ liệu thô đến ra quyết định, bằng hình ảnh.",
    },
    description: {
      en: "An analytics workbook turning datasets into decision-ready dashboards and narratives. Exploratory analysis in Python, exported as interactive HTML reports.",
      vi: "Bộ phân tích biến dữ liệu thành dashboard và câu chuyện sẵn sàng cho ra quyết định. Phân tích khám phá bằng Python, xuất báo cáo HTML tương tác.",
    },
    highlights: {
      en: ["Exploratory data analysis", "Interactive HTML reports", "Decision-oriented storytelling"],
      vi: ["Phân tích dữ liệu khám phá", "Báo cáo HTML tương tác", "Kể chuyện hướng quyết định"],
    },
    stack: ["Python", "pandas", "Plotly", "HTML"],
    category: "data",
    repo: "https://github.com/ducnolag/Data_To_Decision_Making",
    year: 2026,
    featured: false,
    accent: "#7C3AED",
  },
  {
    slug: "lab-manager",
    title: "Lab Room Manager",
    tagline: {
      en: "Desktop system for managing university computer labs.",
      vi: "Hệ thống quản lý phòng máy thực hành cho trường đại học.",
    },
    description: {
      en: "A C# desktop application with a T-SQL backend for scheduling, tracking and maintaining university practice labs: rooms, machines, sessions and incidents.",
      vi: "Ứng dụng desktop C# với backend T-SQL để lập lịch, theo dõi và bảo trì phòng máy thực hành: phòng, máy, ca thực hành và sự cố.",
    },
    highlights: {
      en: ["C# desktop client", "SQL Server schema & procedures", "Role-based workflows"],
      vi: ["Client desktop C#", "Schema & procedure SQL Server", "Luồng theo vai trò"],
    },
    stack: ["C#", ".NET", "SQL Server", "T-SQL"],
    category: "system",
    repo: "https://github.com/ducnolag/QL_Phong_May_Thuc_Hanh",
    year: 2026,
    featured: false,
    accent: "#00F0FF",
  },
  {
    slug: "fall-detection",
    title: "Human Fall Detection",
    tagline: {
      en: "Pose-based video analysis that spots a person falling.",
      vi: "Phân tích video dựa trên tư thế để phát hiện người ngã.",
    },
    description: {
      en: "A video pipeline that extracts 17 body key-points per person with YOLOv7-POSE and classifies falling vs. not-falling, exploring LSTM and rule-based approaches on a small real-world dataset.",
      vi: "Pipeline video trích xuất 17 điểm khớp cơ thể mỗi người bằng YOLOv7-POSE và phân loại ngã / không ngã, thử nghiệm LSTM và luật trên bộ dữ liệu thực tế nhỏ.",
    },
    highlights: {
      en: ["YOLOv7-POSE key-points", "LSTM experiments", "Dockerised inference"],
      vi: ["Điểm khớp YOLOv7-POSE", "Thử nghiệm LSTM", "Suy luận Docker hoá"],
    },
    stack: ["Python", "PyTorch", "YOLOv7", "OpenCV"],
    category: "ai",
    repo: "https://github.com/ducnolag/Human-Fall-Detection",
    year: 2026,
    featured: false,
    accent: "#C6FF00",
  },
  {
    slug: "noodles-shop",
    title: "Noodles Shop",
    tagline: {
      en: "A playful e-commerce front-end for a noodle brand.",
      vi: "Front-end thương mại điện tử vui nhộn cho một thương hiệu mì.",
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
    repo: "https://github.com/ducnolag/Websitez-Buy_Noodles-FE",
    year: 2025,
    featured: false,
    accent: "#FF2BD6",
  },
];

export const skills: { group: L; items: string[] }[] = [
  { group: { en: "AI & Data", vi: "AI & Dữ liệu" }, items: ["Python", "scikit-learn", "XGBoost", "PyTorch", "pandas", "Gemini API", "LLM agents"] },
  { group: { en: "Web", vi: "Web" }, items: ["TypeScript", "Next.js", "React", "NestJS", "Tailwind CSS", "Three.js"] },
  { group: { en: "Systems", vi: "Hệ thống" }, items: ["PostgreSQL", "SQL Server", "Docker", "NGINX", "C# / .NET"] },
  { group: { en: "Business Analysis", vi: "Phân tích nghiệp vụ" }, items: ["Requirements", "Process modelling", "Data storytelling", "Product thinking"] },
];

export const ui = {
  nav: {
    about: { en: "About", vi: "Giới thiệu" },
    projects: { en: "Projects", vi: "Dự án" },
    skills: { en: "Skills", vi: "Kỹ năng" },
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
          "It thinks when I think, and ships when I ship.",
          "Scroll on. It'll show you around.",
        ],
        vi: [
          "Gặp Lag, bạn đồng hành của mình. Đừng để cái tên đánh lừa.",
          "Mình nghĩ, nó nghĩ. Mình ship, nó ship.",
          "Cuộn tiếp. Nó sẽ dẫn bạn đi một vòng.",
        ],
      } as L<string[]>,
      hint: { en: "Move your mouse. It's watching.", vi: "Di chuột thử. Nó đang nhìn đấy." },
      name: { en: "Lag", vi: "Lag" },
    },
  },
  about: {
    heading: { en: "About me", vi: "Về mình" },
    statement: {
      en: "Good products don't just solve problems. They leave a memorable experience.",
      vi: "Sản phẩm tốt không chỉ giải quyết vấn đề. Nó để lại một trải nghiệm đáng nhớ.",
    },
    facts: {
      en: ["Based in Vietnam", "BA × AI × Full-stack", "Open to collaborations"],
      vi: ["Sống tại Việt Nam", "BA × AI × Full-stack", "Sẵn sàng hợp tác"],
    } as L<string[]>,
  },
  projects: {
    heading: { en: "Selected work", vi: "Dự án tiêu biểu" },
    viewRepo: { en: "View on GitHub", vi: "Xem trên GitHub" },
    viewDemo: { en: "Live demo", vi: "Bản demo" },
    all: { en: "All", vi: "Tất cả" },
    filters: {
      ai: { en: "AI", vi: "AI" },
      web: { en: "Web", vi: "Web" },
      data: { en: "Data", vi: "Dữ liệu" },
      system: { en: "Systems", vi: "Hệ thống" },
    } as Record<Project["category"], L>,
    more: { en: "More on GitHub", vi: "Xem thêm trên GitHub" },
    dragHint: { en: "Drag sideways", vi: "Kéo ngang" },
  },
  marquee: {
    en: "Ideas → products · Business Analyst · AI Engineer · Full-stack · ",
    vi: "Ý tưởng → sản phẩm · Business Analyst · AI Engineer · Full-stack · ",
  } as L,
  skills: {
    heading: { en: "Toolbox", vi: "Hộp công cụ" },
  },
  contact: {
    heading: { en: "Let's build something", vi: "Cùng làm gì đó nhé" },
    body: {
      en: "Have an idea, a role, or just want to talk products and AI? My inbox is open.",
      vi: "Có ý tưởng, một vị trí, hay chỉ muốn trò chuyện về sản phẩm và AI? Hộp thư của mình luôn mở.",
    },
    emailCta: { en: "Say hello", vi: "Gửi lời chào" },
    copy: { en: "Copy email", vi: "Sao chép email" },
    copied: { en: "Copied!", vi: "Đã sao chép!" },
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
