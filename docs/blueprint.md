# **App Name**: Controle de Saída SESI

## Core Features:

- User Authentication & Role-Based Access: Secure login via email/password using Firebase Authentication. Users are redirected based on their 'role' ('operator' or 'viewer') stored in Firestore upon successful login. Blocks access if role not found.
- Operator Dashboard: Student CRUD: Full Create, Read, Update, and Delete (CRUD) functionality for student records. Includes selecting classes and searching students by name.
- Operator Dashboard: Class CRUD: Full Create, Read, Update, and Delete (CRUD) functionality for class records.
- Operator Dashboard: Student Call Management: Operators can initiate a 'call' for a student, generating a new 'call' record in Firestore, or cancel an ongoing call, updating the status. This feature includes real-time status display ('not called today' vs 'called today').
- Operator Dashboard: Daily Call History: View a list of all student calls made on the current day, with filtering options by class and student name.
- Viewer Dashboard: Real-time Call Display: Viewers can see students currently 'called out' in real-time. This dashboard dynamically updates as operators make calls, filtered by class.
- Firestore Security Rules & Data Structure: Implementation of robust Firestore Security Rules to enforce read/write permissions based on user roles ('operator' vs 'viewer'). Defines clear Firestore collection and document structures for 'users', 'students', 'classes', and 'calls'.

## Style Guidelines:

- Primary color: Deep, sophisticated slate-blue (#2E426B) to evoke professionalism and control in a light color scheme.
- Background color: A very light, desaturated blue-gray (#F9FAFA) providing a clean, spacious canvas for UI elements.
- Accent color: A vibrant, clear cyan (#3CC3DD) to highlight interactive elements, calls to action, and important information.
- Headline and body font: 'Inter' (sans-serif) for its modern, neutral, and highly readable characteristics, fitting an objective and clean interface.
- Minimalist and clean line icons with rounded edges, reminiscent of system-level iconography, to ensure clarity and avoid visual clutter. Emphasize clarity and intuitive recognition.
- Emphasize a clean, highly organized, and responsive layout. Utilize modern cards with subtle shadows and consistent rounded borders for content segmentation, ensuring seamless experience across desktop and mobile devices. A clear hierarchy will guide user attention effectively.
- Smooth, subtle transitions and micro-animations for UI element states (e.g., button presses, card hovers, data loading) to enhance the user experience with a premium, responsive feel. Avoid jarring or excessive motion.