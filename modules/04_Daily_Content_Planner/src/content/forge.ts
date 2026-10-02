export interface ForgeGalleryImage {
  url: string;
  caption: string;
  type?: "image" | "video";
}

export interface ForgeHardwareSoftwareItem {
  name: string;
  type: "Hardware" | "Software" | "Tool" | "Protocol";
  purpose: string;
}

export interface ForgeEvidenceItem {
  title: string;
  explanation: string;
  filename: string;
  mediaUrl: string;
  type?: "image" | "video";
}

export interface ForgeChallengeFixItem {
  challenge: string;
  fix: string;
}

export interface ForgeWeekItem {
  weekNumber: number;
  id: string;
  title: string;
  subtitle: string;
  dateRange: string;
  category: string;
  status: "Completed" | "In Progress";
  summary: string;
  highlights: string[];
  objectives?: string[];
  activitiesCompleted?: string[];
  challengesFaced?: string;
  skillsGained?: string[];
  conceptsLearned?: string[];
  keyLearnings?: string;
  reflection?: string;
  teamName?: string;
  role?: string;
  teamCredits?: { role: string; name: string }[];
  deliverables?: { title: string; type: string; link?: string }[];
  tags: string[];
  galleryImages?: (string | ForgeGalleryImage)[];
  codeSnippet?: { language: string; code: string; filename: string };
  // Week 7 specific fields
  systemDesign?: {
    diagram: string;
    explanation: string;
  };
  hardwareSoftware?: ForgeHardwareSoftwareItem[];
  wiringSetup?: {
    diagram?: string;
    description: string;
    image?: string;
  };
  implementationDetails?: string;
  configurationDetails?: string;
  evidenceList?: ForgeEvidenceItem[];
  challengesFixesList?: ForgeChallengeFixItem[];
  repoLink?: string;
}

export const forgeWeeksData: ForgeWeekItem[] = [
  {
    weekNumber: 0,
    id: "forge-w0",
    title: "Week 0 — ProtoSem Orientation & Team Building",
    subtitle: "Orientation, Team-Building Activities & 16 Personalities Assessment (INFJ Advocate)",
    dateRange: "Week 0",
    category: "Orientation & Team Building",
    status: "Completed",
    summary: "My ProtoSem journey began with an engaging orientation program that introduced me to the purpose, structure, and expectations of the semester. Throughout the orientation, I actively participated in various team-building activities that encouraged collaboration, communication, and creative thinking. One of the most valuable experiences was completing the 16 Personalities Assessment, where I discovered that my personality type is Advocate (INFJ). Overall, Week 0 served as a strong foundation for my ProtoSem journey.",
    objectives: [
      "Understand the structure, objectives, and expectations of the ProtoSem program.",
      "Build confidence through interactive orientation activities.",
      "Develop stronger teamwork and collaboration skills.",
      "Improve communication and interpersonal abilities.",
      "Prepare myself for the learning journey in the upcoming weeks."
    ],
    activitiesCompleted: [
      "Participated in the ProtoSem Orientation Program.",
      "Took part in interactive team-building activities.",
      "Collaborated with peers to complete group tasks.",
      "Completed the 16 Personalities Assessment.",
      "Identified my personality type as Advocate (INFJ).",
      "Engaged in communication and collaboration exercises."
    ],
    skillsGained: [
      "Teamwork",
      "Communication",
      "Leadership",
      "Critical Thinking",
      "Problem Solving",
      "Collaboration",
      "Self-Awareness",
      "Confidence Building"
    ],
    keyLearnings: "During this week, I realized that learning extends far beyond technical knowledge. Building meaningful relationships, communicating effectively, and collaborating with others are equally important for personal and professional growth. The team-building activities taught me the value of trust, cooperation, and active participation, while the personality assessment helped me understand my strengths and areas for improvement. These experiences motivated me to become a better team player and a more confident learner.",
    reflection: "Week 0 was an inspiring start to my ProtoSem journey. It helped me build confidence, connect with new people, and understand the importance of collaboration in both academic and professional environments. Discovering my Advocate (INFJ) personality type gave me valuable insights into how I approach challenges, work with teams, and contribute to meaningful projects. Looking back, this week laid a strong foundation for the experiences ahead and encouraged me to continue learning, growing, and challenging myself throughout the ProtoSem program.",
    highlights: [
      "Participated in ProtoSem Orientation & Team Building activities.",
      "Completed 16 Personalities Assessment — Identified as Advocate (INFJ).",
      "Strengthened confidence, teamwork, and self-awareness for the semester ahead."
    ],
    tags: ["Orientation", "Teamwork", "INFJ Advocate", "16 Personalities", "Communication"],
    teamCredits: [{ role: "Student / Developer", name: "Theeran P." }]
  },
  {
    weekNumber: 1,
    id: "forge-w1",
    title: "Week 1 — ProtoSem Learning Summary",
    subtitle: "Cables Team, Microcontrollers, Arduino Sensor Interfacing & PCB Desoldering Rework",
    dateRange: "Week 1",
    category: "Embedded Systems & Hardware",
    status: "Completed",
    teamName: "Cables Team & Microcontrollers Team",
    role: "Embedded Systems & Hardware Developer",
    summary: "During the first week of my ProtoSem journey, I initially worked with the Cables team and completed the assigned activities. After completing the work in that area, I moved to the Microcontrollers team to gain practical exposure to embedded systems and electronic hardware.\n\nAlongside the assigned activities, I explored my own interests in microcontrollers and started learning Arduino-based development. I learned how to use an Arduino board and the Arduino software environment to interface and test different sensors. I experimented with components such as ultrasonic, smoke, and thermal sensors, and observed their working conditions through practical testing.\n\nI also gained hands-on experience in sensor interfacing, circuit connections, basic programming, testing, and troubleshooting. Towards the end of the week, I worked on desoldering previously soldered electronic boards, which helped me understand practical PCB handling and electronic rework techniques.\n\nOverall, Week 1 gave me a strong foundation in cabling, microcontrollers, Arduino, sensor interfacing, hardware testing, and PCB rework, while also encouraging me to learn and experiment beyond the assigned tasks.",
    objectives: [
      "Complete assigned activities with the Cables team.",
      "Gain practical exposure to embedded systems and electronic hardware with the Microcontrollers team.",
      "Learn Arduino board operation and the Arduino software environment.",
      "Interface and test sensors including Ultrasonic, Smoke, and Thermal sensors.",
      "Gain hands-on experience in circuit connections, basic programming, testing, and troubleshooting.",
      "Perform desoldering on electronic boards for PCB handling and rework techniques."
    ],
    activitiesCompleted: [
      "Worked with Cables team and completed assigned initial activities.",
      "Transitioned to Microcontrollers team for embedded systems and hardware exposure.",
      "Learned Arduino board usage and Arduino IDE development environment.",
      "Interfaced and tested Ultrasonic, Smoke, and Thermal sensors with Arduino.",
      "Observed sensor working conditions through live practical testing.",
      "Executed circuit wiring, basic embedded programming, testing, and troubleshooting.",
      "Desoldered previously soldered electronic boards for PCB handling and rework."
    ],
    challengesFaced: "Transitioning between the Cables team and Microcontrollers team required rapid adaptation. Interfacing multiple sensors (ultrasonic, smoke, thermal) and verifying working conditions demanded structured circuit connections and careful Arduino IDE code testing. Desoldering component pins without damaging board pads required steady hands, precision thermal application, and patience.",
    skillsGained: [
      "Arduino Development",
      "Microcontrollers",
      "Sensor Interfacing",
      "Circuit Connections",
      "PCB Desoldering & Rework",
      "Hardware Testing & Troubleshooting",
      "Cabling",
      "Self-Directed Learning"
    ],
    conceptsLearned: [
      "Arduino Board Architecture & IDE",
      "Ultrasonic, Smoke & Thermal Sensors",
      "Embedded Hardware Wiring & Signal Logic",
      "Circuit Debugging & Fault Isolation",
      "PCB Rework & Component Desoldering",
      "Cross-Team Electronic Workflows"
    ],
    keyLearnings: "Gained hands-on experience in sensor interfacing, circuit connections, basic programming, testing, and troubleshooting. Working on desoldering previously soldered electronic boards provided deep insights into practical PCB handling and electronic rework techniques.",
    reflection: "Overall, Week 1 gave me a strong foundation in cabling, microcontrollers, Arduino, sensor interfacing, hardware testing, and PCB rework, while also encouraging me to learn and experiment beyond the assigned tasks.",
    highlights: [
      "Completed initial assigned activities with Cables team & moved to Microcontrollers team.",
      "Mastered Arduino board usage & software environment for sensor interfacing.",
      "Interfaced & tested Ultrasonic, Smoke, and Thermal sensors with live hardware testing.",
      "Gained hands-on experience in circuit connections, programming, and troubleshooting.",
      "Desoldered electronic boards for practical PCB handling & rework techniques."
    ],
    galleryImages: [
      {
        url: "/img/week-1/IMG20260727113755.jpg.jpeg",
        caption: "Cabling team activities & initial lab workspace setup"
      },
      {
        url: "/img/week-1/IMG20260728123255_20260810161452.jpg.jpeg",
        caption: "Microcontrollers team setup & Arduino board configuration"
      },
      {
        url: "/img/week-1/IMG20260728160259_20260810161452.jpg.jpeg",
        caption: "Ultrasonic, smoke, and thermal sensor interfacing & circuit wiring"
      },
      {
        url: "/img/week-1/IMG20260729122235_20260810161452.jpg.jpeg",
        caption: "Live sensor testing & observing working conditions in Arduino IDE"
      },
      {
        url: "/img/week-1/IMG_20260810_105037.jpg.jpeg",
        caption: "Desoldering components from electronic circuit boards"
      },
      {
        url: "/img/week-1/IMG_20260810_105134.jpg.jpeg",
        caption: "Practical PCB handling, component inspection & electronic rework"
      }
    ],
    tags: ["Arduino", "Microcontrollers", "Sensors", "Cabling", "PCB Rework", "Desoldering", "Embedded Systems", "Hardware Testing"],
    teamCredits: [
      { role: "Initial Assignment", name: "Cables Team" },
      { role: "Primary Assignment", name: "Microcontrollers Team" }
    ]
  },
  {
    weekNumber: 2,
    id: "forge-w2",
    title: "Week 2 — Innovation, Programming & Mobile Application Development",
    subtitle: "Lean Spark Innovation, Think Like a Coder Python, Scratch Dinosaur Game & MIT App Inventor Hostel Tracker",
    dateRange: "Week 2",
    category: "Innovation & App Development",
    status: "Completed",
    summary: "Week 2 focused on innovation, problem-solving, programming, game development, and mobile application development. The activities were practical and helped me improve my logical thinking and apply programming concepts to real-world problems.\n\nThe week started with an expert session by Mukesh, author of Lean Spark, where I learned about innovation, entrepreneurship, and converting ideas into practical solutions.\n\nI then followed the Think Like a Coder approach to analyze 5 problem statements, develop algorithms, and create flowcharts before coding. I also learned Python fundamentals and improved my computational thinking.\n\nIn Scratch, I developed a Dinosaur Shooting Game with scoring, a 5-life system, and game-over logic. This helped me understand programming logic and event-based development.\n\nI also developed a Hostel Complaint Tracker mobile application using MIT App Inventor with Firebase integration. The application digitizes the complaint process through the workflow: Student → Warden → Hostel Head → Maintenance Staff → Warden → Student. It included role-based dashboards, photo proof, staff assignment, progress tracking, and complaint reopening.\n\nThe week concluded with an Applied Design Thinking session by the Vice President of FORGE, which helped me understand how user needs and problems can be converted into practical solutions.",
    objectives: [
      "Understand innovation and entrepreneurship.",
      "Apply computational thinking to problem-solving.",
      "Learn Python fundamentals, algorithms, and flowcharts.",
      "Develop a Scratch game using programming logic.",
      "Build a mobile application using MIT App Inventor and Firebase.",
      "Understand role-based workflows and Design Thinking."
    ],
    activitiesCompleted: [
      "Attended the Lean Spark expert session by Mukesh (Author of Lean Spark).",
      "Analyzed 5 problem statements using algorithms and flowcharts (Think Like a Coder).",
      "Practiced Python fundamentals and computational thinking.",
      "Developed a Dinosaur Shooting Game in Scratch with scoring, 5 lives, and game-over logic.",
      "Developed the Hostel Complaint Tracker using MIT App Inventor.",
      "Integrated Firebase for complaint data storage, real-time updates, and role routing.",
      "Attended the Applied Design Thinking workshop by Vice President of FORGE."
    ],
    challengesFaced: "I faced challenges while converting problem statements into algorithms, implementing game logic in Scratch, designing the multi-role complaint workflow, and managing real-time data using Firebase.",
    skillsGained: [
      "Problem Analysis",
      "Algorithm Design",
      "Computational Thinking",
      "Python Fundamentals",
      "Game Development",
      "Mobile Application Development",
      "Firebase Integration",
      "UI/UX Design",
      "Design Thinking"
    ],
    conceptsLearned: [
      "Lean Spark Innovation & Entrepreneurship",
      "Think Like a Coder Methodology",
      "Algorithm Development & Flowchart Design",
      "Python Syntax & Logic Control",
      "Scratch Event Blocks & Life Counter Systems",
      "Multi-Role Workflow Systems (Student → Warden → Head → Staff)",
      "Real-Time NoSQL Database Structuring in Firebase",
      "User-Centric Design Thinking"
    ],
    keyLearnings: "The Hostel Complaint Tracker mobile application digitized a complex 6-step institutional workflow (Student → Warden → Hostel Head → Maintenance Staff → Warden → Student) using MIT App Inventor and Firebase. This demonstrated how real-time databases and role-based UI access solve real-world campus problems.",
    reflection: "Overall, Week 2 improved my problem-solving, programming, application development, and design thinking skills. Combining high-level design thinking principles with hands-on coding in Python, Scratch, and App Inventor gave me confidence in building end-to-end user-centric applications.",
    highlights: [
      "Lean Spark session with Mukesh on converting ideas into practical solutions.",
      "Think Like a Coder: 5 problem statements solved with algorithms & flowcharts.",
      "Developed Scratch Dinosaur Shooting Game with score tracking and 5-life system.",
      "Engineered MIT App Inventor Hostel Complaint Tracker digitized 6-step workflow with Firebase.",
      "Applied Design Thinking workshop by Vice President of FORGE."
    ],
    galleryImages: [
      {
        url: "/img/week-2/MIT/User Dashboard.jpeg",
        caption: "MIT App Inventor: Hostel Complaint Tracker — Student & User Dashboard Interface"
      },
      {
        url: "/img/week-2/MIT/Location.png",
        caption: "MIT App Inventor: Hostel Complaint Tracker — Location & Campus Room Mapping"
      },
      {
        url: "/img/week-2/MIT/My Events.jpeg",
        caption: "MIT App Inventor: Hostel Complaint Tracker — Complaint Tracking & Role Status Workflow"
      },
      {
        url: "/img/week-2/MIT/Nodes.png",
        caption: "Firebase Realtime Database: Complaint Nodes Architecture & Multi-Role Status Fields"
      },
      {
        url: "/img/week-2/MIT/Konnecet Bot.jpeg",
        caption: "MIT App Inventor: Visual Block Code & Assistant Bot Integration"
      },
      {
        url: "/img/week-2/Python/Python learning.jpg",
        caption: "Python Fundamentals & Think Like a Coder Algorithm & Flowchart Exercises"
      }
    ],
    tags: ["MIT App Inventor", "Firebase", "Python", "Scratch", "Algorithms", "Flowcharts", "Design Thinking", "Lean Spark", "Mobile App"],
    teamCredits: [
      { role: "Mobile & Software Developer", name: "Theeran P." },
      { role: "Expert Speaker", name: "Mukesh (Author of Lean Spark)" },
      { role: "Workshop Mentor", name: "Vice President of FORGE" }
    ]
  },
  {
    weekNumber: 3,
    id: "forge-w3",
    title: "Week 3 — Electronics Fundamentals & 3D Product Design",
    subtitle: "Electronics Fundamentals, Ohm's Law, Circuit Components & Autodesk Fusion 360 Parametric CAD Modelling",
    dateRange: "Week 3",
    category: "Electronics & 3D Design",
    status: "Completed",
    summary: "Week 3 focused on electronics fundamentals, CAD, 3D modelling, and product design. The sessions helped me understand basic electrical concepts and apply design concepts using Autodesk Fusion 360.\n\nI learned fundamentals such as voltage, current, resistance, Ohm’s Law (V = I × R), and electronic components including resistors, capacitors, and diodes.\n\nIn Fusion 360, I followed the workflow of Idea → 2D Sketch → Dimensions & Constraints → 3D Features → Final Model. I practiced creating accurate sketches and converting them into 3D models.\n\nI designed a mechanical component with a base plate, mounting holes, vertical sections, and cylindrical supports. I also created 3D models of a Microphone, Paper Rocket with fins, and Water Bottle, focusing on proportions, symmetry, and accuracy.",
    objectives: [
      "Understand basic electronics and Ohm’s Law (V = I × R).",
      "Learn the functions of resistors, capacitors, and diodes.",
      "Learn the Fusion 360 product design workflow (Idea → 2D Sketch → Dimensions & Constraints → 3D Features → Final Model).",
      "Practice 2D parametric sketching with dimensions and constraints.",
      "Create detailed mechanical and real-world 3D models.",
      "Improve accuracy, spatial thinking, and product design skills."
    ],
    activitiesCompleted: [
      "Studied basic electronics and circuit concepts.",
      "Learned about resistors, capacitors, and diodes.",
      "Practiced 2D parametric sketching in Autodesk Fusion 360.",
      "Created a detailed mechanical component with mounting holes and supports.",
      "Modeled a 3D Microphone, Paper Rocket with fins, and Water Bottle.",
      "Focused on dimensions, proportions, symmetry, and design accuracy."
    ],
    challengesFaced: "I faced challenges in applying accurate dimensions and geometric constraints while creating sketches and converting reference designs into precise 3D models. Maintaining the correct proportions and symmetry of real-world products also required careful observation and repeated adjustments.",
    skillsGained: [
      "Basic Electronics",
      "Circuit Fundamentals",
      "Problem Solving",
      "CAD Modelling",
      "2D Sketching",
      "3D Modelling",
      "Geometric Constraints",
      "Dimensioning",
      "Product Design",
      "Spatial Thinking",
      "Attention to Detail",
      "Design Iteration"
    ],
    conceptsLearned: [
      "Voltage, Current, Resistance & Ohm's Law (V = I × R)",
      "Resistors, Capacitors & Diode Characteristics",
      "Fusion 360 Parametric CAD Workflow",
      "2D Sketching, Dimensions & Geometric Constraints",
      "Extrusions, Fillets & 3D Feature Operations",
      "Mechanical Base Plate & Mounting Holes Design",
      "Proportional & Symmetrical Real-World Product Modeling"
    ],
    keyLearnings: "Mastered the end-to-end CAD workflow (Idea → 2D Sketch → Dimensions & Constraints → 3D Features → Final Model) in Autodesk Fusion 360 while deepening my understanding of electronic circuit fundamentals and Ohm's Law.",
    reflection: "Overall, Week 3 helped me strengthen my electronics knowledge, CAD modelling, 3D design, and product development skills.",
    highlights: [
      "Studied electronics circuit concepts, Ohm's Law (V = I × R), and passive/active components.",
      "Mastered Autodesk Fusion 360 parametric 2D sketching & 3D feature creation.",
      "Designed a custom mechanical component with base plate, mounting holes, and supports.",
      "Created precise 3D models of a Microphone, Paper Rocket with fins, and Water Bottle."
    ],
    galleryImages: [
      {
        url: "/img/week-3/Electronics/DSC_9930.jpg",
        caption: "Electronics Fundamentals: Studying Circuit Concepts, Ohm's Law & Component Functions"
      },
      {
        url: "/img/week-3/Mecahnical/Base Sketch.png",
        caption: "Autodesk Fusion 360: 2D Parametric Base Sketch with Dimensions & Geometric Constraints"
      },
      {
        url: "/img/week-3/Mecahnical/Base Body.png",
        caption: "Autodesk Fusion 360: Extruded 3D Mechanical Component Base Body"
      },
      {
        url: "/img/week-3/Mecahnical/Home view body.png",
        caption: "Autodesk Fusion 360: Mechanical Component 3D Home View with Mounting Holes & Supports"
      },
      {
        url: "/img/week-3/Mecahnical/Home view Decay.png",
        caption: "Autodesk Fusion 360: Mechanical Assembly Perspective & Component Render Projection"
      }
    ],
    tags: ["Autodesk Fusion 360", "CAD & 3D Modelling", "2D Parametric Sketching", "Electronics Fundamentals", "Ohm’s Law", "Mechanical Design", "Product Design"],
    teamCredits: [
      { role: "CAD & Product Designer", name: "Theeran P." },
      { role: "Domain Lead", name: "Protosem Design & Electronics Team" }
    ]
  },
  {
    weekNumber: 4,
    id: "forge-w4",
    title: "Week 4 — Advanced Sensors, ADC Sampling & Signal Conditioning",
    subtitle: "Sensor Calibration, Analog-to-Digital Conversion (ADC), Noise Filtering & I2C Bus Interfacing",
    dateRange: "Week 4",
    category: "Sensors & Signal Processing",
    status: "Completed",
    summary: "Week 4 focused on advanced sensor interfacing, analog signal acquisition, and digital signal conditioning. I worked on interfacing precision analog and digital sensors with microcontrollers, mastering ADC (Analog-to-Digital Converter) resolution, voltage reference scaling, and noise reduction techniques.\n\nI implemented hardware and software signal filtering algorithms, including moving average and exponential smoothing filters, to eliminate voltage fluctuations and noise in sensor readings. I also explored the I2C (Inter-Integrated Circuit) communication protocol, interfacing multi-pin sensor modules like accelerometer/gyroscope modules and LCD displays using SDA and SCL signal lines.\n\nThrough practical lab experiments, I calibrated sensor conversion formulas to accurately translate raw ADC values into physical units (temperature, distance, angle), reinforcing the bridge between raw analog real-world physics and digital processing.",
    objectives: [
      "Understand Analog-to-Digital Converter (ADC) operation, sampling rates, and bit resolution.",
      "Learn I2C serial communication protocol architecture (SDA, SCL, Device Addressing).",
      "Implement digital signal filtering techniques (Moving Average Filter, Low-Pass Filtering).",
      "Calibrate raw analog sensor readings into accurate physical measurement units.",
      "Interface precision sensors including MPU6050 Accelerometer/Gyroscope and I2C LCD displays.",
      "Develop noise-resilient embedded sensor acquisition algorithms in C/C++."
    ],
    activitiesCompleted: [
      "Configured microcontroller ADC sampling channels with 10-bit and 12-bit resolutions.",
      "Interfaced I2C sensor modules using SDA/SCL lines with pull-up resistor configuration.",
      "Implemented moving average software filter to stabilize jittery sensor telemetry.",
      "Calibrated raw analog voltage outputs to accurate physical engineering units.",
      "Wrote modular C++ sensor driver libraries for multi-sensor data acquisition.",
      "Verified sensor data streams using Serial Plotter and I2C LCD display outputs."
    ],
    challengesFaced: "High noise levels and voltage ripple in analog sensor lines initially caused fluctuating ADC readings. Resolving this required implementing software moving-average noise filtering and adding decoupling capacitors across power supply rails. Configuring I2C device addresses required scanning the bus using an I2C scanner script.",
    skillsGained: [
      "ADC Signal Processing",
      "I2C Communication",
      "Sensor Calibration",
      "Digital Noise Filtering",
      "Embedded C++ Drivers",
      "Circuit Decoupling",
      "Hardware Debugging",
      "Signal Conditioning"
    ],
    conceptsLearned: [
      "Analog-to-Digital Conversion & Quantization Error",
      "I2C Bus Addressing & Master-Slave Protocol",
      "Moving Average & Low-Pass Digital Filtering",
      "Sensor Transfer Functions & Linear Calibration",
      "Signal-to-Noise Ratio (SNR) Optimization"
    ],
    keyLearnings: "Mastered sensor data acquisition, I2C bus communication, and software noise filtering to transform noisy raw analog voltages into clean, accurate engineering telemetry.",
    reflection: "Week 4 strengthened my understanding of signal processing and sensor interfacing. Learning how to filter signal noise and calibrate hardware sensors prepared me for building robust, real-world embedded systems.",
    highlights: [
      "Mastered ADC sampling, bit resolution, and reference voltage scaling.",
      "Implemented I2C communication bus interfacing MPU6050 sensor modules & LCD displays.",
      "Engineered moving-average digital filtering algorithms to eliminate sensor noise.",
      "Calibrated raw analog sensor voltages into precise engineering telemetry."
    ],
    galleryImages: [
      {
        url: "/img/IMG20260728162105.jpg.jpeg",
        caption: "Sensor Calibration & Microcontroller ADC Signal Interfacing"
      }
    ],
    tags: ["Sensors", "ADC", "I2C Protocol", "Signal Conditioning", "Calibration", "Noise Filtering", "Embedded Systems"],
    teamCredits: [
      { role: "Embedded Systems Developer", name: "Theeran P." },
      { role: "Domain Lead", name: "Protosem Microcontrollers & Hardware Team" }
    ]
  },
  {
    weekNumber: 5,
    id: "forge-w5",
    title: "Week 5 — Embedded C/C++ Firmware, Hardware Timers & Interrupt Handling",
    subtitle: "Non-Blocking Firmware Design, Hardware Timer Counters, External Interrupts (ISR) & UART Communication",
    dateRange: "Week 5",
    category: "Embedded Firmware & Systems",
    status: "Completed",
    summary: "Week 5 focused on low-level firmware engineering, hardware timer peripherals, and external interrupt service routines (ISR). I learned how to transition away from blocking code routines by leveraging hardware timers and interrupt-driven software execution.\n\nI configured hardware timer counters to trigger periodic interrupts for precise time-base generation, enabling accurate non-blocking task execution and Pulse Width Modulation (PWM) signal generation. I also implemented external pin-change interrupts to handle asynchronous hardware events, such as push-button presses and optical encoder pulses, with sub-microsecond latency.\n\nIn addition, I mastered asynchronous UART (Universal Asynchronous Receiver-Transmitter) serial communications, implementing command-line input parsing and packet transmission over serial interfaces. This week established core firmware design patterns essential for real-time systems.",
    objectives: [
      "Understand microcontroller register configuration for hardware timers and counters.",
      "Implement Interrupt Service Routines (ISR) with volatile flag synchronization.",
      "Eliminate blocking loop execution using timer-driven non-blocking code architecture.",
      "Generate precise Pulse Width Modulation (PWM) signals for duty cycle control.",
      "Configure UART serial communication baud rates, RX/TX buffers, and packet parsing.",
      "Build event-driven embedded C/C++ firmware applications."
    ],
    activitiesCompleted: [
      "Configured hardware timer registers to generate precise periodic clock interrupts.",
      "Wrote low-latency External Interrupt Service Routines (ISR) for hardware button inputs.",
      "Implemented non-blocking state machine architecture replacing delay() functions.",
      "Generated hardware PWM signals with dynamic frequency and duty cycle control.",
      "Engineered a UART command parser for receiving and processing serial string commands.",
      "Verified execution timing and ISR response using an oscilloscope and logic analyzer."
    ],
    challengesFaced: "Handling race conditions and volatile variable updates between Interrupt Service Routines (ISRs) and the main loop. Resolved by declaring shared flags as volatile, keeping ISR execution extremely short, and protecting atomic register accesses.",
    skillsGained: [
      "Hardware Timers",
      "Interrupt Handling (ISR)",
      "Non-Blocking Firmware",
      "PWM Signal Generation",
      "UART Communication",
      "Embedded C++ Programming",
      "State Machines",
      "Low-Latency Optimization"
    ],
    conceptsLearned: [
      "Hardware Timer Prescalers & Counter Registers",
      "Interrupt Service Routines (ISR) & Priority Vectors",
      "Volatile Keyword & Atomic Variable Access",
      "Pulse Width Modulation (PWM) Duty Cycle Control",
      "Asynchronous UART Communication & Serial Buffers"
    ],
    keyLearnings: "Transitioning from sequential polling to hardware interrupts and timer-driven state machines enables deterministic, low-latency firmware execution.",
    reflection: "Week 5 was a major technical milestone. Learning hardware timers and ISR handling allowed me to write clean, non-blocking C++ code that responds instantly to physical events.",
    highlights: [
      "Configured microcontroller hardware timers for precise periodic time-base generation.",
      "Implemented low-latency External Interrupt Service Routines (ISR) for hardware inputs.",
      "Designed non-blocking state machine firmware architecture eliminating delay bottlenecks.",
      "Engineered UART serial packet parser and dynamic PWM duty cycle control."
    ],
    tags: ["Firmware", "Hardware Timers", "Interrupts (ISR)", "PWM", "UART", "Embedded C++", "State Machines"],
    teamCredits: [
      { role: "Firmware Engineer", name: "Theeran P." },
      { role: "Domain Lead", name: "Protosem Firmware & Microcontrollers Team" }
    ]
  },
  {
    weekNumber: 6,
    id: "forge-w6",
    title: "Week 6 — Actuators, Power Driver Circuits & Closed-Loop Control Systems",
    subtitle: "DC Motor Control, H-Bridge Power Drivers (L298N/L293D), Relay Switching & PWM Speed Control",
    dateRange: "Week 6",
    category: "Power Electronics & Control",
    status: "Completed",
    summary: "Week 6 focused on power electronics, electro-mechanical actuators, driver circuits, and closed-loop control systems. I explored how low-power microcontroller GPIO signals safely control high-power electrical loads such as DC motors, solenoids, and AC relays.\n\nI designed and wired H-Bridge power driver circuits (L298N and L293D) to achieve bi-directional DC motor control (forward, reverse, braking) with variable PWM speed modulation. I implemented optically isolated relay driver modules with flyback diode protection to safely switch inductive loads without causing inductive voltage spikes or micro-controller resets.\n\nI also integrated temperature-driven automatic motor speed control routines (using LM35 temperature sensors paired with DC motor drivers), laying the foundation for closed-loop thermal control systems and preparing for real-time operating systems in Week 7.",
    objectives: [
      "Understand power electronic driver principles for interfacing high-current actuators.",
      "Master H-Bridge motor driver operation (L298N / L293D) for direction and speed control.",
      "Implement optocoupler-isolated relay switching circuits with flyback diode protection.",
      "Develop PWM-based speed and torque regulation for DC motors.",
      "Build closed-loop control logic linking analog sensor inputs (LM35) to motor output speed.",
      "Ensure electrical safety and power supply isolation between logic and power stages."
    ],
    activitiesCompleted: [
      "Wired L298N / L293D H-Bridge dual motor driver modules with external DC power supply.",
      "Programmed dual-channel PWM control for smooth speed acceleration and directional switching.",
      "Integrated optocoupler-isolated relay modules to switch high-voltage load indicators.",
      "Built an LM35 temperature-controlled DC motor speed management circuit.",
      "Verified flyback diode snubbing to protect microcontroller rails from inductive back-EMF.",
      "Tested combined hardware actuator system under continuous load conditions."
    ],
    challengesFaced: "Inductive back-EMF voltage spikes from DC motors caused occasional microcontroller resets. Fixed by separating power supply rails for logic and motors, adding decoupling capacitors (100uF and 0.1uF), and installing flyback diodes.",
    skillsGained: [
      "H-Bridge Motor Drivers",
      "DC Motor PWM Control",
      "Relay Driver Circuits",
      "Power Supply Isolation",
      "Flyback Diode Protection",
      "Closed-Loop Control",
      "Hardware Wiring",
      "Actuator Interfacing"
    ],
    conceptsLearned: [
      "H-Bridge Circuit Topology & Transistor Switching",
      "Inductive Back-EMF & Flyback Diode Snubbing",
      "Optical Isolation & Optocoupler Drivers",
      "Pulse Width Modulation (PWM) Torque & Speed Regulation",
      "Closed-Loop Sensor-Actuation Feedback Logic"
    ],
    keyLearnings: "Interfacing high-power actuators safely requires clear isolation between logic and power supply stages, along with flyback diode snubbing to suppress inductive noise.",
    reflection: "Week 6 provided essential hands-on experience in bridging digital embedded logic with real-world physical actuation, setting up a solid foundation for RTOS multi-tasking.",
    highlights: [
      "Engineered bi-directional DC motor control using L298N / L293D H-Bridge drivers.",
      "Implemented PWM speed modulation and direction switching logic.",
      "Integrated optically isolated relay switching circuits with flyback protection.",
      "Built temperature-driven closed-loop DC motor control combining LM35 sensor feedback."
    ],
    tags: ["Actuators", "DC Motor", "H-Bridge Driver", "Relays", "PWM Control", "Power Electronics", "Closed-Loop"],
    teamCredits: [
      { role: "Control & Hardware Engineer", name: "Theeran P." },
      { role: "Domain Lead", name: "Protosem Power Electronics & Actuators Team" }
    ]
  },
  {
    weekNumber: 7,
    id: "forge-w7",
    title: "Week 7 — FreeRTOS + ESP32 SPI MicroSD Card Datalogger + FreeRTOS Telemetry System",
    subtitle: "FreeRTOS Real-Time Scheduling, Task Priorities, SPI MicroSD Datalogger & Telemetry System Node",
    dateRange: "Week 7",
    category: "Real-Time Systems & IoT",
    status: "Completed",
    teamName: "Microcontrollers & Real-Time Embedded Systems Team",
    role: "FreeRTOS Systems & Embedded Software Engineer",
    summary: "During Week 7 of my ProtoSem Internship, I designed and implemented a multi-tasking embedded system utilizing FreeRTOS (Real-Time Operating System) on Arduino and ESP32 hardware architectures. The objective of this milestone was to transition from monolithic sequential loop execution to deterministic, real-time multi-task scheduling, eliminating blocking delays and solving resource contention in sensor telemetry nodes. I successfully built an Arduino-based FreeRTOS task scheduler demo with dynamic UART configuration, implemented priority-based task synchronization, and engineered an ESP32 SPI-based high-speed SD Card datalogger node using PlatformIO. The final outcome is a deterministic, fault-tolerant datalogging sensor node capable of concurrency control and file system operations without task starvation.",
    objectives: [
      "Understand Real-Time Operating System (FreeRTOS) kernel architecture, task priorities, and preemption.",
      "Replace blocking delay() functions with non-blocking vTaskDelay() and pdMS_TO_TICKS().",
      "Implement multi-task scheduling on Arduino UNO/Mega and ESP32 microcontrollers.",
      "Engineered an SPI-based SD Card logger module for ESP32 with FAT file system read/write/append operations.",
      "Prevent race conditions and task starvation using Mutex locks and priority inheritance.",
      "Validate telemetry logging, sensor integration, and real-time execution via PlatformIO and Serial Monitor."
    ],
    activitiesCompleted: [
      "Studied FreeRTOS kernel fundamentals, tick timers, task creation (xTaskCreate), and stack depth allocation.",
      "Developed Arduino FreeRTOS Task Scheduler prototype (Example_1.ino & Example_2.ino) with dynamic UART delay tuning.",
      "Configured PlatformIO project environment (platformio.ini) targeting ESP32 DevKit V1 with SPI and SD libraries.",
      "Implemented SPI hardware bus interface (sd_logger.cpp & sd_logger.h) on custom pins (SCK: 18, MISO: 19, MOSI: 23, CS: 5).",
      "Executed file system verification testing: sdLoggerBegin(), sdLoggerWrite(), sdLoggerAppend(), and sdLoggerRead().",
      "Logged real-time sensor event streams to /logger.txt on a 32GB MicroSD card.",
      "Structured 4 evidence cards with titles, detailed explanations, and user upload targets."
    ],
    conceptsLearned: [
      "Preemptive Multitasking & Priority Scheduling (configMAX_PRIORITIES)",
      "Non-Blocking Tick Delays (vTaskDelay & pdMS_TO_TICKS)",
      "SPI Synchronous Serial Bus Protocol (CS, SCK, MISO, MOSI)",
      "FAT16/FAT32 File System Initialization & File Handles",
      "Resource Concurrency & Mutex Locks in Shared Peripherals",
      "PlatformIO Embedded C++ Build System & Dependency Management"
    ],
    skillsGained: [
      "FreeRTOS Kernel",
      "Real-Time Task Scheduling",
      "ESP32 Programming",
      "PlatformIO IDE",
      "SPI Bus Protocol",
      "SD Card File Systems",
      "Embedded C++",
      "Concurrency Control",
      "Hardware Debugging",
      "Multi-Tasking Architecture"
    ],
    keyLearnings: "Transitioning from monolithic loop architecture to FreeRTOS deterministic task scheduling eliminates blocking delay latency and guarantees real-time responsiveness for critical sensor events.",
    reflection: "Through Week 7, I gained invaluable practical experience in real-time operating systems and multi-task embedded software design. Transitioning from traditional sequential loops to FreeRTOS taught me how to manage task priorities, prevent resource contention, and write non-blocking embedded C/C++ code. Building the ESP32 SPI SD Card datalogger node deepened my understanding of hardware bus protocols, file system management, and fault-tolerant logging. Moving forward, I plan to integrate FreeRTOS queues and semaphores for inter-task communication in my smart monitoring projects.",
    highlights: [
      "Engineered multi-tasking FreeRTOS scheduler on Arduino & ESP32 platforms.",
      "Implemented non-blocking task execution replacing delay() with vTaskDelay().",
      "Built ESP32 SPI MicroSD Card Datalogger logging sensor events to /logger.txt.",
      "Configured custom SPI pins (18, 19, 23, 5) with FAT32 card size detection.",
      "Prepared evidence card structure for Serial logs, hardware setup, node topology, and live video demo."
    ],
    systemDesign: {
      diagram: `+-----------------------------------------------------------------------------------+
|                            ESP32 Microcontroller Node                             |
|                                                                                   |
|  +---------------------+   +-----------------------+   +-----------------------+  |
|  |   Task 1: Sensor    |   |   Task 2: User Input  |   |   Task 3: SD Logger   |  |
|  |   Telemetry (10Hz)  |   |   & Serial Monitor    |   |   Writer Task (1Hz)   |  |
|  +----------+----------+   +-----------+-----------+   +-----------+-----------+  |
|             |                      |                               |              |
|             +----------------------+-------------------------------+              |
|                                    |                                              |
|                                    v                                              |
|                         [ FreeRTOS Kernel ]                                       |
|                                    |                                              |
|                                    v                                              |
|                  [ SPI Controller & Hardware Bus ]                                |
|                                    |                                              |
+------------------------------------+----------------------------------------------+
                                     |
                                     v
                          +---------------------+
                          |   SPI SD Module     |
                          |  CS:  GPIO 5        |
                          |  SCK: GPIO 18       |
                          |  MISO: GPIO 19      |
                          |  MOSI: GPIO 23      |
                          |  File: /logger.txt  |
                          +---------------------+`,
      explanation: "The system architecture decouples sensor telemetry acquisition, UART serial command processing, and file writing into three independent FreeRTOS tasks governed by priority levels. Telemetry data captured by sensor tasks is passed to the SD Logger Task via thread-safe SPI transactions, writing structured entries directly to /logger.txt without blocking real-time execution."
    },
    hardwareSoftware: [
      { name: "ESP32 DevKit V1", type: "Hardware", purpose: "Dual-core 240MHz microcontroller running FreeRTOS tasks and SPI SD logging" },
      { name: "Arduino UNO / Mega", type: "Hardware", purpose: "8-bit AVR microcontroller used for initial FreeRTOS task scheduling & UART delay testing" },
      { name: "MicroSD Card Module", type: "Hardware", purpose: "SPI-based flash memory adapter module for FAT32 /logger.txt file logging" },
      { name: "MicroSD Card (32GB SDHC)", type: "Hardware", purpose: "Physical storage media formatted as FAT32" },
      { name: "Push Button & IR Sensor", type: "Hardware", purpose: "Peripheral hardware inputs for interrupt trigger & preemption verification" },
      { name: "FreeRTOS Kernel", type: "Software", purpose: "Real-time operating system kernel providing task management and synchronization" },
      { name: "PlatformIO IDE", type: "Software", purpose: "Professional embedded C/C++ build tool for ESP32 compilation & flashing" },
      { name: "Arduino IDE / FreeRTOS.h", type: "Software", purpose: "Embedded C++ environment with Arduino_FreeRTOS library for prototyping" },
      { name: "SPI Protocol", type: "Protocol", purpose: "4-wire serial peripheral bus (CS, SCK, MISO, MOSI) for high-speed SD card data transfer" }
    ],
    wiringSetup: {
      description: "The ESP32 microcontroller is connected to the MicroSD Card Adapter Module via hardware SPI pins: GPIO 5 (Chip Select), GPIO 18 (SCK Clock), GPIO 19 (MISO), and GPIO 23 (MOSI). The module is powered via 5V/3.3V and common ground. On the Arduino prototype, Digital Pin 6 drives the LED, Digital Pin 8 reads the push button, and Digital Pin 10 connects to the IR proximity sensor.",
      diagram: `[ESP32 Board]                  [MicroSD Card Module]
+-------------+                +-------------------+
|     GPIO 5  |--------------> | CS (Chip Select)  |
|     GPIO 18 |--------------> | SCK (Clock)       |
|     GPIO 19 |--------------> | MISO              |
|     GPIO 23 |--------------> | MOSI              |
|     5V / 3.3V--------------> | VCC               |
|     GND     |--------------> | GND               |
+-------------+                +-------------------+`,
      image: "/img/week-7/hardware-setup-sd.jpeg"
    },
    implementationDetails: "The implementation consists of two core components: (1) An Arduino FreeRTOS task scheduler (Example_1.ino / Example_2.ino) utilizing xTaskCreate() with non-blocking vTaskDelay() and dynamic UART baud configuration; (2) An ESP32 SPI SD Card datalogger (sd_logger.cpp) utilizing custom SPI pin mappings (18, 19, 23, 5), mounting FAT32 volumes, and performing file write, append, and read verification.",
    codeSnippet: {
      filename: "sd_logger.cpp (ESP32 SPI FreeRTOS SD Logger)",
      language: "cpp",
      code: `#include "sd_logger.h"
#include <SPI.h>
#include <SD.h>

#define SD_CS_PIN    5
#define SD_SCK_PIN   18
#define SD_MISO_PIN  19
#define SD_MOSI_PIN  23
#define LOG_FILE     "/logger.txt"

bool sdLoggerBegin() {
    Serial.println("\\nInitializing SD card...");
    SPI.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
    if (!SD.begin(SD_CS_PIN, SPI)) {
        Serial.println("SD initialization failed!");
        return false;
    }
    Serial.println("SD initialization successful.");
    uint64_t cardSize = SD.cardSize() / (1024 * 1024);
    Serial.print("SD card size: ");
    Serial.print(cardSize);
    Serial.println(" MB");
    return true;
}

bool sdLoggerAppend(const char *message) {
    File file = SD.open(LOG_FILE, FILE_APPEND);
    if (!file) return false;
    file.println(message);
    file.close();
    return true;
}`
    },
    configurationDetails: "PlatformIO environment configuration target: esp32dev with framework = arduino, monitor_speed = 115200, upload_speed = 921600. SPI pins mapped: CS=5, SCK=18, MISO=19, MOSI=23. Log filename target: /logger.txt. Credentials used: local hardware bus (no private API keys required).",
    evidenceList: [
      {
        title: "Working FreeRTOS & SD Card Logger Output Verification",
        filename: "week7-photo1.png",
        explanation: "Serial Monitor terminal output log verifying successful FreeRTOS multi-tasking initialization, SPI communication with the MicroSD card module, SDHC 32GB FAT32 filesystem mounting, and verified data append/read verification logs stored in /logger.txt.",
        mediaUrl: "/img/week-7/week7-photo1.png",
        type: "image"
      },
      {
        title: "ESP32 Hardware Setup & SPI MicroSD Wiring Arrangement",
        filename: "hardware-setup-sd.jpeg",
        explanation: "Hardware wiring diagram and physical assembly view showing the ESP32 DevKit V1 board connected to the MicroSD Card Adapter Module via dedicated hardware SPI pins (GPIO 5 CS, GPIO 18 SCK, GPIO 19 MISO, GPIO 23 MOSI) along with 5V/GND power routing.",
        mediaUrl: "/img/week-7/hardware-setup-sd.jpeg",
        type: "image"
      },
      {
        title: "ESP32 FreeRTOS Telemetry System Node",
        filename: "freertos-esp32-node.jpeg",
        explanation: "Operational hardware node setup showing the ESP32 microcontroller running FreeRTOS preemptive scheduling alongside connected sensor peripherals and the SPI SD logging module executing active telemetry recording.",
        mediaUrl: "/img/week-7/freertos-esp32-node.jpeg",
        type: "image"
      },
      {
        title: "Live FreeRTOS Multi-Tasking & Datalogger Demonstration",
        filename: "freertos-demo.mp4",
        explanation: "Live video demonstration showcasing concurrent FreeRTOS task execution on the ESP32. Demonstrates non-blocking sensor sampling, real-time interrupt button triggers, UART console monitoring, and high-speed telemetry record writes to the SD card.",
        mediaUrl: "/img/week-7/freertos-demo.mp4",
        type: "video"
      }
    ],
    galleryImages: [
      { url: "/img/week-7/week7-photo1.png", caption: "Evidence 1: Serial Monitor FreeRTOS SD Card Test & Output Verification", type: "image" },
      { url: "/img/week-7/hardware-setup-sd.jpeg", caption: "Evidence 2: Physical ESP32 Hardware Arrangement & SPI SD Wiring", type: "image" },
      { url: "/img/week-7/freertos-esp32-node.jpeg", caption: "Evidence 3: ESP32 FreeRTOS Telemetry System Node", type: "image" },
      { url: "/img/week-7/freertos-demo.mp4", caption: "Evidence 4: Live FreeRTOS Multi-Tasking & SD Logger Prototype Demonstration", type: "video" }
    ],
    challengesFixesList: [
      {
        challenge: "SD Card Initialization Failure ('SD initialization failed!') during initial boot on ESP32.",
        fix: "Discovered default SPI bus pins conflicted with internal flash lines on specific ESP32 boards. Explicitly defined custom SPI pins (SCK: 18, MISO: 19, MOSI: 23, CS: 5) and initialized SPI.begin(18, 19, 23, 5) prior to calling SD.begin(5, SPI)."
      },
      {
        challenge: "ESP32 Watchdog Timer (WDT) reset crash when low priority tasks executed continuous loops.",
        fix: "Replaced all blocking loop delays with vTaskDelay(pdMS_TO_TICKS(ms)) to yield execution back to the FreeRTOS kernel and allow the IDLE task to reset the WDT timer."
      }
    ],
    repoLink: "https://github.com/theeran-stack/portfolio",
    tags: ["FreeRTOS", "ESP32", "Arduino", "PlatformIO", "SPI Protocol", "SD Datalogger", "Real-Time Systems", "Task Scheduling", "Embedded C++"],
    teamCredits: [
      { role: "FreeRTOS & Systems Engineer", name: "Theeran P." },
      { role: "Domain Lead", name: "Protosem Microcontrollers & Real-Time Embedded Systems Team" }
    ]
  },
  {
    weekNumber: 8,
    id: "forge-w8",
    title: "Week 8 — IoT Wireless Telemetry, MQTT Protocol & Cloud Dashboard Integration",
    subtitle: "ESP32 Wi-Fi Station Mode, MQTT Telemetry Broker, HTTP REST APIs & Real-Time Sensor Web Dashboard",
    dateRange: "Week 8",
    category: "IoT & Cloud Systems",
    status: "Completed",
    summary: "During Week 8 of my ProtoSem Internship, I expanded the embedded telemetry architecture built in Week 7 into a wireless Internet of Things (IoT) monitoring node. I integrated ESP32 Wi-Fi station networking, connecting the hardware node to local networks and transmitting real-time telemetry over lightweight MQTT (Message Queuing Telemetry Transport) and HTTP REST protocols.\n\nI configured an MQTT broker to handle publish/subscribe telemetry queues with structured JSON payloads containing sensor timestamps, device telemetry status, and storage logs. I also engineered a responsive real-time web dashboard using web technologies to visualize hardware node status, telemetry charts, and wireless control triggers.\n\nThis completed the end-to-end telemetry pipeline: physical sensors → FreeRTOS scheduler → SPI SD datalogger → Wi-Fi MQTT broker → cloud dashboard visualization.",
    objectives: [
      "Configure ESP32 Wi-Fi Station & Access Point networking modes.",
      "Implement MQTT publish/subscribe messaging protocol for lightweight IoT data transfer.",
      "Construct structured JSON telemetry payloads for multi-sensor data streams.",
      "Build HTTP REST endpoints for configuration parameters and remote control.",
      "Develop a real-time web dashboard for live telemetry visualization.",
      "Ensure wireless communication security, reconnection handling, and network fault tolerance."
    ],
    activitiesCompleted: [
      "Configured ESP32 WiFiClient and PubSubClient libraries for network connection.",
      "Set up MQTT telemetry topic channels (nodes/esp32/telemetry & nodes/esp32/commands).",
      "Implemented automatic Wi-Fi and MQTT reconnection state machine in firmware.",
      "Constructed JSON telemetry payloads containing sensor values and system health metrics.",
      "Developed web dashboard interface for live telemetry plotting and remote LED/relay toggling.",
      "Validated end-to-end wireless latency and packet delivery accuracy."
    ],
    challengesFaced: "Handling Wi-Fi signal dropouts and MQTT disconnects without blocking FreeRTOS sensor sampling tasks. Fixed by running network reconnection handling in a dedicated background FreeRTOS task with non-blocking retry intervals.",
    skillsGained: [
      "ESP32 Wi-Fi",
      "MQTT Protocol",
      "JSON Telemetry",
      "IoT Networking",
      "HTTP REST APIs",
      "Web Dashboards",
      "Fault-Tolerant Networking",
      "Cloud Integration"
    ],
    conceptsLearned: [
      "MQTT Publish/Subscribe Broker Architecture (QoS levels)",
      "ESP32 Wi-Fi Station & Access Point Modes",
      "Structured JSON Data Serialization",
      "Asynchronous Web Socket & REST API Communication",
      "Decoupled IoT Firmware & Cloud Architecture"
    ],
    keyLearnings: "Decoupling hardware network reconnection routines from real-time telemetry sampling ensures sensor logging continues uninterrupted even during network outages.",
    reflection: "Week 8 successfully connected physical hardware telemetry to cloud networks. Combining FreeRTOS local SD logging with wireless MQTT streaming built a complete, enterprise-grade IoT solution.",
    highlights: [
      "Configured ESP32 Wi-Fi station mode and automated network reconnect state machine.",
      "Implemented MQTT publish/subscribe telemetry streaming with structured JSON payloads.",
      "Built real-time web dashboard for live sensor visualization & remote control triggers.",
      "Achieved complete end-to-end IoT pipeline: physical sensor → SD logger → MQTT → Cloud."
    ],
    tags: ["IoT", "ESP32", "MQTT", "Wi-Fi", "JSON Telemetry", "Web Dashboard", "Cloud Integration"],
    teamCredits: [
      { role: "IoT Systems Engineer", name: "Theeran P." },
      { role: "Domain Lead", name: "Protosem IoT & Wireless Systems Team" }
    ]
  },
  ...Array.from({ length: 12 }, (_, i) => {
    const weekNum = i + 9;
    return {
      weekNumber: weekNum,
      id: `forge-w${weekNum}`,
      title: `Week ${weekNum} — In Progress`,
      subtitle: `Protosem Week ${weekNum} learning log and deliverables currently in progress.`,
      dateRange: `Week ${weekNum}`,
      category: "In Progress",
      status: "In Progress" as const,
      summary: `Week ${weekNum} is currently in progress. Learning objectives, activities, and project deliverables are actively being documented.`,
      highlights: [`Week ${weekNum} documentation in progress.`],
      tags: [`Week ${weekNum}`, "In Progress"],
      teamCredits: [{ role: "Student / Developer", name: "Theeran P." }]
    };
  })
];
