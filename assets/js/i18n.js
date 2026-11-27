/* English ↔ Amharic for the whole site, and day / night mode.
   How translation works: the site is written in English; when Amharic is chosen, every piece of text
   that appears in the AM list below is swapped on screen (and swapped back for English).
   To improve or add a translation, edit the AM list: "English text exactly as on screen": "Amharic".
   Text typed by people (notices, lab titles, student names) stays as written. */
(() => {
const AM = {
  // menus and common words
  'Home': 'ዋና ገጽ', 'Chemistry': 'ኬሚስትሪ', 'Electricity': 'ኤሌክትሪክ', 'Biology': 'ባዮሎጂ', 'Mathematics': 'ሒሳብ', 'Coding': 'ፕሮግራሚንግ',
  'Physics': 'ፊዚክስ', 'Playground': 'የኮድ መለማመጃ', 'Club': 'ክበብ', 'Learn': 'ኮርሶች', 'AI Studio': 'AI ስቱዲዮ', 'Log in': 'ግባ', 'Log out': 'ውጣ',
  'My progress': 'የኔ እድገት', 'Exams': 'ፈተናዎች', 'Certificates': 'ሰርተፊኬቶች', 'Overview': 'አጠቃላይ እይታ', 'Students': 'ተማሪዎች',
  'Exam builder': 'ፈተና ማዘጋጃ', 'Admin': 'አስተዳዳሪ', 'Notices': 'ማስታወቂያዎች', 'Guide': 'መመሪያ', 'Setup': 'ማዋቀሪያ', 'Courses': 'ኮርሶች',
  'Check a certificate': 'ሰርተፊኬት ያረጋግጡ', 'Join the club': 'ክበቡን ይቀላቀሉ', 'Save': 'አስቀምጥ', 'Cancel': 'ተው', 'Delete': 'ሰርዝ', 'Edit': 'አስተካክል',
  'Send': 'ላክ', 'Yes': 'አዎ', 'Close': 'ዝጋ', 'Back': 'ተመለስ', '← Back': '← ተመለስ', 'Next': 'ቀጣይ', 'Previous': 'ቀዳሚ', 'Loading…': 'በመጫን ላይ…',
  'Search': 'ፈልግ', 'All subjects': 'ሁሉም የትምህርት ዓይነቶች', 'All grades': 'ሁሉም ክፍሎች', 'Grade': 'ክፍል', 'Date': 'ቀን', 'Score': 'ውጤት', 'Result': 'ውጤት',
  'Name': 'ስም', 'Role': 'ሚና', 'Questions': 'ጥያቄዎች', 'Status': 'ሁኔታ', 'Student': 'ተማሪ', 'Exam': 'ፈተና', 'Lab': 'ቤተ ሙከራ', 'Subject': 'የትምህርት ዓይነት',
  'Grade 9': '9ኛ ክፍል', 'Grade 10': '10ኛ ክፍል', 'Grade 11': '11ኛ ክፍል', 'Grade 12': '12ኛ ክፍል', 'Teacher': 'መምህር',
  'student': 'ተማሪ', 'teacher': 'መምህር', 'admin': 'አስተዳዳሪ', 'Demo mode.': 'የሙከራ ሁኔታ።', 'Reset demo data': 'የሙከራ መረጃውን አድስ',
  'Accounts and results are saved only in this browser.': 'መለያዎችና ውጤቶች የሚቀመጡት በዚህ ብራውዘር ብቻ ነው።', 'How to go live': 'እንዴት በቀጥታ ማስጀመር ይቻላል',

  // home
  'Dangila Secondary School · STEM Club': 'ዳንግላ ሁለተኛ ደረጃ ትምህርት ቤት · STEM ክበብ', 'Dangila STEM Club': 'ዳንግላ STEM ክበብ',
  'Try science with your own hands': 'ሳይንስን በራሳችሁ እጅ ሞክሩ',
  'Mix chemicals, build circuits, watch living systems change and see maths move. Log in to track your progress, take exams and earn Dangila STEM certificates.':
    'ኬሚካሎችን ቀላቅሉ፣ የኤሌክትሪክ ዑደቶችን ሥሩ፣ ሕያዋን ሥርዓቶች ሲለወጡ ተመልከቱ፣ ሒሳብ ሲንቀሳቀስ እዩ። እድገታችሁን ለመከታተል፣ ፈተና ለመውሰድና የዳንግላ STEM ሰርተፊኬት ለማግኘት ግቡ።',
  'My dashboard': 'የኔ ዳሽቦርድ', 'Choose a lab': 'ቤተ ሙከራ ይምረጡ', 'All simulations': 'ሁሉም ሲሙሌሽኖች', 'Club notice board': 'የክበቡ ማስታወቂያ ሰሌዳ',
  'All notices and forms': 'ሁሉም ማስታወቂያዎችና ቅጾች', 'Earn Dangila STEM certificates': 'የዳንግላ STEM ሰርተፊኬቶችን ያግኙ',
  'Explorer': 'አሳሽ', 'Investigator': 'መርማሪ', 'Scientist': 'ሳይንቲስት', 'STEM Scholar': 'የSTEM ምሁር',
  'Open every lab': 'እያንዳንዱን ቤተ ሙከራ ይክፈቱ', 'Complete every lab and pass an exam': 'ሁሉንም ቤተ ሙከራዎች ያጠናቅቁና አንድ ፈተና ያልፉ',
  'Pass two exams, 85% average': 'ሁለት ፈተናዎችን በ85% አማካይ ያልፉ', 'Investigator in every subject': 'በሁሉም የትምህርት ዓይነቶች መርማሪ',
  'Search, e.g. acid, circuit, graph': 'ይፈልጉ፣ ለምሳሌ አሲድ፣ ዑደት፣ ግራፍ', 'No labs match. Try another word.': 'የሚስማማ ቤተ ሙከራ የለም። ሌላ ቃል ይሞክሩ።',
  '✓ Completed': '✓ ተጠናቋል', 'Started': 'ተጀምሯል', 'No notices yet.': 'እስካሁን ማስታወቂያ የለም።',

  // lab pages
  'Your task': 'የእርስዎ ተግባር', 'Check yourself': 'ራስዎን ይፈትሹ', 'Not started': 'አልተጀመረም', 'Completed': 'ተጠናቋል', 'In progress': 'በሂደት ላይ',
  'Outside simulation': 'የውጭ ሲሙሌሽን', 'Hands-on': 'በተግባር', 'Python': 'ፓይተን', 'I did this experiment': 'ይህን ሙከራ ሠርቻለሁ', '✓ Recorded': '✓ ተመዝግቧል',
  'Open full screen ↗': 'በሙሉ ገጽ ክፈት ↗', '✦ Ask the tutor about this lab': '✦ ስለዚህ ቤተ ሙከራ አስጠኚውን ይጠይቁ',
  'Reaction mixer': 'የኬሚካል ቅልቅል', 'pH and indicators': 'pH እና አመልካቾች', 'Circuit builder: series and parallel': 'የዑደት ግንባታ፡ ተከታታይና ትይዩ',
  'Ohm’s law lab': 'የኦም ሕግ ቤተ ሙከራ', 'Predators and prey': 'አዳኞችና ታዳኞች', 'Diffusion through a cell membrane': 'በሕዋስ ሽፋን በኩል ስርጭት',
  'Graph transformer': 'የግራፍ ለዋጭ', 'Unit circle and the sine wave': 'የአሃድ ክብና የሳይን ሞገድ', 'Two dice: probability': 'ሁለት ዳይስ፡ ዕድል',
  'Mix': 'ቀላቅል', 'Empty beaker': 'ቢከሩን አጽዳ', 'First chemical': 'የመጀመሪያው ኬሚካል', 'Second chemical': 'ሁለተኛው ኬሚካል',
  'You see:': 'የሚታየው፡', 'Why:': 'ምክንያቱ፡', 'Series': 'ተከታታይ', 'Parallel': 'ትይዩ', 'Open switch': 'ማብሪያውን ክፈት', 'Close switch': 'ማብሪያውን ዝጋ',
  'Battery voltage': 'የባትሪ ቮልቴጅ', 'Total resistance': 'ጠቅላላ ተቃውሞ', 'Current from battery': 'ከባትሪው የሚወጣ ፍሰት', 'Bulb 1 power': 'የአምፖል 1 ኃይል', 'Bulb 2 power': 'የአምፖል 2 ኃይል',
  'Replace burnt bulbs': 'የተቃጠሉ አምፖሎችን ቀይር', 'Record reading': 'ንባቡን መዝግብ', 'Clear': 'አጽዳ', 'Voltage': 'ቮልቴጅ', 'Ammeter reading': 'የአሚተር ንባብ',
  'Points taken': 'የተወሰዱ ነጥቦች', 'Pause': 'አቁም', 'Play': 'ቀጥል', 'Restart': 'እንደገና ጀምር', 'Antelope': 'ሚዳቋ', 'Lions': 'አንበሶች',
  'Pore size': 'የቀዳዳ መጠን', 'Temperature': 'ሙቀት', 'Speed': 'ፍጥነት', 'Roll once': 'አንድ ጊዜ ጣል', 'Roll 100': '100 ጊዜ ጣል', 'Roll 1,000': '1,000 ጊዜ ጣል', 'Reset': 'አድስ',
  'Reset sliders': 'ተንሸራታቾቹን አድስ', 'pH value': 'የpH ዋጋ', 'Acidic': 'አሲዳማ', 'Neutral': 'ገለልተኛ', 'Alkaline (basic)': 'አልካላይን (ቤዝ)',

  // coding
  '▶ Run': '▶ አሂድ', 'Check my answer': 'መልሴን አረጋግጥ', 'Stop': 'አቁም', 'Reset code': 'ኮዱን መልስ', 'Ask the tutor': 'አስጠኚውን ይጠይቁ',
  'Ctrl + Enter runs your code': 'Ctrl + Enter ኮድዎን ያሄዳል', 'Program input': 'የፕሮግራም ግብዓት', 'Python playground': 'የፓይተን መለማመጃ',
  'Open the Python playground': 'የፓይተን መለማመጃውን ክፈት', 'Save my code': 'ኮዴን አስቀምጥ', 'Download .py': '.py አውርድ', 'Coding exercises': 'የኮድ ልምምዶች', 'Example': 'ምሳሌ',

  // tutor and AI
  'AI tutor': 'AI አስጠኚ', 'Ask a question in English or Amharic…': 'በእንግሊዝኛ ወይም በአማርኛ ጥያቄ ይጠይቁ…', 'New chat': 'አዲስ ውይይት',
  'Explain this lab simply': 'ይህን ቤተ ሙከራ በቀላሉ አስረዳኝ', 'Give me a hint': 'ፍንጭ ስጠኝ', 'Quiz me with one question': 'በአንድ ጥያቄ ፈትነኝ',
  'Why does this happen?': 'ይህ ለምን ይሆናል?', 'Explain the main ideas': 'ዋና ሐሳቦቹን አስረዳኝ', 'Give me a real-life example': 'ከእውነተኛ ሕይወት ምሳሌ ስጠኝ',
  'The tutor can make mistakes. Check important facts with your teacher.': 'አስጠኚው ሊሳሳት ይችላል። አስፈላጊ እውነታዎችን ከመምህርዎ ጋር ያረጋግጡ።',

  // login and account
  'Username': 'የተጠቃሚ ስም', 'Password': 'የይለፍ ቃል', 'Use the username and password your teacher gave you.': 'መምህርዎ የሰጡዎትን የተጠቃሚ ስምና የይለፍ ቃል ይጠቀሙ።',
  'Forgot your password? Ask your teacher to reset it.': 'የይለፍ ቃልዎን ረሱ? መምህርዎ እንዲያድሱልዎት ይጠይቁ።', 'Demo accounts': 'የሙከራ መለያዎች',
  'Labs completed': 'የተጠናቀቁ ቤተ ሙከራዎች', 'Time in labs': 'በቤተ ሙከራ የቆዩበት ጊዜ', 'Exams passed': 'ያለፉባቸው ፈተናዎች', 'Average best score': 'አማካይ ከፍተኛ ውጤት',
  'Progress by subject': 'እድገት በትምህርት ዓይነት', 'Exam results': 'የፈተና ውጤቶች', 'Continue learning': 'መማርዎን ይቀጥሉ', 'Exam waiting': 'የሚጠብቅ ፈተና',
  'New certificate ready': 'አዲስ ሰርተፊኬት ዝግጁ ነው', 'Collect your certificate': 'ሰርተፊኬትዎን ይውሰዱ', 'You reached a new level': 'አዲስ ደረጃ ላይ ደርሰዋል',
  'No level yet': 'ገና ደረጃ የለም', 'Complete every lab': 'ሁሉንም ቤተ ሙከራዎች ያጠናቅቁ', 'Pass 1 exam': '1 ፈተና ያልፉ', 'Pass 2 exams, average 85%+': '2 ፈተናዎችን በ85%+ አማካይ ያልፉ',
  'Passed': 'አልፏል', 'Not passed': 'አላለፈም', 'No exams taken yet.': 'እስካሁን ፈተና አልተወሰደም።', 'No certificates yet.': 'እስካሁን ሰርተፊኬት የለም።',
  'My certificates': 'የኔ ሰርተፊኬቶች', 'Earned': 'የተገኙ', 'Next levels': 'ቀጣይ ደረጃዎች', 'Top level reached.': 'ከፍተኛው ደረጃ ላይ ደርሰዋል።',
  'Print or save as PDF': 'አትም ወይም PDF አስቀምጥ', 'Copy certificate code': 'የሰርተፊኬቱን ኮድ ቅዳ', 'Certificate code': 'የሰርተፊኬት ኮድ', 'Check': 'አረጋግጥ',
  '✓ Valid certificate': '✓ ትክክለኛ ሰርተፊኬት', 'No certificate found': 'ሰርተፊኬት አልተገኘም',

  // exams
  'Start exam': 'ፈተናውን ጀምር', 'Try again': 'እንደገና ሞክር', 'Start now': 'አሁን ጀምር', 'Not now': 'አሁን አይደለም', 'Submit exam': 'ፈተናውን አስገባ',
  'Marks': 'ማርክ', 'Time': 'ሰዓት', 'Pass mark': 'ማለፊያ ነጥብ', 'No limit': 'ገደብ የለም', 'You passed!': 'አልፈዋል!', 'Not passed this time': 'በዚህ ጊዜ አላለፉም',
  'Your answers': 'የእርስዎ መልሶች', 'See my progress': 'እድገቴን አሳይ', 'All exams': 'ሁሉም ፈተናዎች', 'No attempts left.': 'የቀረ ሙከራ የለም።',
  '+ New exam': '+ አዲስ ፈተና', 'Published': 'ታትሟል', 'Draft': 'ረቂቅ', 'Results': 'ውጤቶች', 'Copy': 'ቅዳ', '+ Add question': '+ ጥያቄ ጨምር', 'Save exam': 'ፈተናውን አስቀምጥ',
  'Paste questions from text': 'ጥያቄዎችን ከጽሑፍ ለጥፍ', '✦ Write questions with AI': '✦ ጥያቄዎችን በAI ጻፍ', 'Question analysis': 'የጥያቄዎች ትንተና', 'Download CSV': 'CSV አውርድ',

  // teacher
  'Students and progress': 'ተማሪዎችና እድገታቸው', '+ Add students': '+ ተማሪዎችን ጨምር', '+ Add teachers': '+ መምህራንን ጨምር', 'Labs': 'ቤተ ሙከራዎች', 'Subjects': 'የትምህርት ዓይነቶች',
  'Users': 'ተጠቃሚዎች', 'Last active': 'መጨረሻ የታዩበት', 'Average': 'አማካይ', 'Reset password': 'የይለፍ ቃል አድስ', 'Print slips': 'ወረቀቶቹን አትም', 'Copy all': 'ሁሉንም ቅዳ',
  'Latest exam results': 'የቅርብ ጊዜ የፈተና ውጤቶች', 'Lab use': 'የቤተ ሙከራ አጠቃቀም', 'Active this week': 'በዚህ ሳምንት ንቁ', 'Exams published': 'የታተሙ ፈተናዎች',
  'Certificates earned': 'የተገኙ ሰርተፊኬቶች', '+ Add a lab': '+ ቤተ ሙከራ ጨምር', '+ Add a subject': '+ የትምህርት ዓይነት ጨምር', '+ New notice': '+ አዲስ ማስታወቂያ',
  'Visible': 'ይታያል', 'Hidden': 'ተደብቋል', 'Hide': 'ደብቅ', 'Show': 'አሳይ',

  // club page
  'Club notices and ideas': 'የክበቡ ማስታወቂያዎችና ሐሳቦች', 'Notice board': 'የማስታወቂያ ሰሌዳ', 'Join': 'ተቀላቀል', 'Suggest an experiment': 'ሙከራ ይጠቁሙ',
  'Your name': 'ስምዎ', 'Your name (optional)': 'ስምዎ (አማራጭ)', 'Your idea': 'ሐሳብዎ', 'Send idea': 'ሐሳቡን ላክ', 'I am most interested in': 'በጣም የሚስበኝ',

  // e-learning
  'My courses': 'የኔ ኮርሶች', 'Start course': 'ኮርሱን ጀምር', 'Continue': 'ቀጥል', 'Lessons': 'ትምህርቶች', 'Assignments': 'የቤት ሥራዎች', 'Assignment': 'የቤት ሥራ',
  'Mark as complete': 'እንደተጠናቀቀ ምልክት አድርግ', '✓ Lesson complete': '✓ ትምህርቱ ተጠናቋል', 'Next lesson →': 'ቀጣይ ትምህርት →', '← Previous lesson': '← ቀዳሚ ትምህርት',
  'Open the lab': 'ቤተ ሙከራውን ክፈት', 'Take the exam': 'ፈተናውን ውሰድ', 'Resources': 'ግብዓቶች', 'Your answer': 'የእርስዎ መልስ', 'Submit': 'አስገባ',
  'Update answer': 'መልሱን አሻሽል', 'Submitted': 'ገብቷል', 'Graded': 'ታርሟል', 'Feedback': 'አስተያየት', 'Not submitted': 'አልገባም', 'Due': 'የመጨረሻ ቀን',
  '+ New course': '+ አዲስ ኮርስ', 'Edit course': 'ኮርሱን አስተካክል', 'Save course': 'ኮርሱን አስቀምጥ', '+ Add lesson': '+ ትምህርት ጨምር', '+ Add assignment': '+ የቤት ሥራ ጨምር',
  'Progress report': 'የእድገት ሪፖርት', 'Submissions': 'የገቡ ሥራዎች', 'Save grade': 'ውጤቱን አስቀምጥ',

  // AI studio
  'Choose a tool': 'መሣሪያ ይምረጡ', 'Choose an AI model': 'የAI ሞዴል ይምረጡ', 'Compare two models': 'ሁለት ሞዴሎችን አወዳድር', 'Ask anything': 'ማንኛውንም ይጠይቁ',
  'Explain simply': 'በቀላሉ አስረዳ', 'Step-by-step solver': 'ደረጃ በደረጃ ፈቺ', 'Translate': 'ተርጉም', 'Flashcards': 'የማስታወሻ ካርዶች', 'Practice quiz': 'የልምምድ ጥያቄዎች',
  'Feedback on my writing': 'በጽሑፌ ላይ አስተያየት', 'Make': 'ፍጠር', 'Flip': 'ገልብጥ',

  // default subject descriptions
  'Mix chemicals in a virtual beaker, watch what forms, and read the balanced equation.': 'ኬሚካሎችን በምናባዊ ቢከር ቀላቅሉ፣ የሚፈጠረውን ተመልከቱ፣ የተመጣጠነውን እኩልታ አንብቡ።',
  'Build circuits, change voltage and resistance, and see current flow.': 'ዑደቶችን ሥሩ፣ ቮልቴጅና ተቃውሞን ቀይሩ፣ የኤሌክትሪክ ፍሰትን ተመልከቱ።',
  'Watch populations rise and fall, and molecules move across a cell membrane.': 'የሕዝብ ብዛት ሲጨምርና ሲቀንስ፣ ሞለኪውሎች በሕዋስ ሽፋን ሲያልፉ ተመልከቱ።',
  'Move graphs with sliders, spin the unit circle, and test probability with dice.': 'ግራፎችን በተንሸራታቾች አንቀሳቅሱ፣ የአሃድ ክብን አሽከርክሩ፣ ዕድልን በዳይስ ፈትሹ።',
  'Write real Python in your browser: solve science and maths problems with code, and get your work checked straight away.': 'በብራውዘራችሁ እውነተኛ ፓይተን ጻፉ፤ የሳይንስና የሒሳብ ችግሮችን በኮድ ፍቱ፣ ሥራችሁም ወዲያውኑ ይፈተሻል።',

  // classroom and sign-up
  'Classes': 'ክፍሎች', 'Stream': 'መልእክቶች', 'Classwork': 'የክፍል ሥራ', 'People': 'አባላት', 'Grades': 'ውጤቶች', 'Join class': 'ክፍሉን ተቀላቀል', 'Class code': 'የክፍል ኮድ',
  '+ New class': '+ አዲስ ክፍል', '+ Create classwork': '+ የክፍል ሥራ ፍጠር', 'Post': 'ለጥፍ', 'Upcoming': 'የሚመጡ', 'Nothing due soon.': 'በቅርቡ የሚደርስ ሥራ የለም።',
  'Teachers': 'መምህራን', 'Leave this class': 'ከዚህ ክፍል ውጣ', 'Open course': 'ኮርሱን ክፈት', 'Open exam': 'ፈተናውን ክፈት', 'Open assignment': 'የቤት ሥራውን ክፈት', 'Open lab': 'ቤተ ሙከራውን ክፈት',
  'To do from my classes': 'ከክፍሎቼ የሚጠበቁ ሥራዎች', 'All caught up!': 'ሁሉንም ጨርሰዋል!', 'Create a student account': 'የተማሪ መለያ ይፍጠሩ', 'Create my account': 'መለያዬን ፍጠር',
  'Full name': 'ሙሉ ስም', 'Choose a username': 'የተጠቃሚ ስም ይምረጡ', 'Choose a password': 'የይለፍ ቃል ይምረጡ', 'Type the password again': 'የይለፍ ቃሉን እንደገና ይጻፉ',
  'Create an account with your class code': 'በክፍል ኮድዎ መለያ ይፍጠሩ', 'New student?': 'አዲስ ተማሪ ነዎት?', 'You need the class code from your teacher.': 'ከመምህርዎ የክፍል ኮድ ያስፈልግዎታል።',
  'Not taken': 'አልተወሰደም', 'Not submitted': 'አልገባም', 'Edit class': 'ክፍሉን አስተካክል', 'New code': 'አዲስ ኮድ', '← Classes': '← ክፍሎች',
  // new labs
  'Physics lab': 'የፊዚክስ ቤተ ሙከራ', 'Projectile motion: launch and land': 'የተወረወረ ነገር እንቅስቃሴ', 'Pendulum and energy': 'ፔንዱለምና ኃይል', 'Forces and motion: F = m × a': 'ኃይልና እንቅስቃሴ፡ F = m × a',
  'Human body explorer': 'የሰው አካል ዳሰሳ', 'Inside the heart': 'የልብ ውስጣዊ ክፍል', 'Cell explorer: animal and plant cells': 'የሕዋስ ዳሰሳ፡ የእንስሳና የዕፅዋት ሕዋሳት',
  'Reactions up close: collision theory': 'ኬሚካላዊ ምላሽ በቅርበት፡ የግጭት ንድፈ ሐሳብ', 'Balancing chemical equations': 'የኬሚካል እኩልታዎችን ማመጣጠን',
  'Launch': 'ወርውር', 'Clear paths': 'መንገዶቹን አጽዳ', 'New target': 'አዲስ ዒላማ', 'Launch angle': 'የመወርወሪያ ማዕዘን', 'Launch speed': 'የመወርወሪያ ፍጥነት', 'Planet': 'ፕላኔት',
  'Release': 'ልቀቅ', 'String length': 'የገመድ ርዝመት', 'Mass of the box': 'የሳጥኑ ክብደት', 'Surface': 'ወለል', 'Stop the box': 'ሳጥኑን አቁም', 'Friction': 'ሰበቃ', 'Net force': 'ተጣማሪ ኃይል',
  'Acceleration': 'ፍጥነት መጨመር', 'Velocity': 'ፍጥነት', 'Exercise!': 'ስፖርት ሥራ!', 'Eat food': 'ምግብ ብላ', 'Labels': 'ስያሜዎች', 'Heart rate': 'የልብ ምት', 'Breathing rate': 'የአተነፋፈስ ፍጥነት',
  'Animal cell': 'የእንስሳ ሕዋስ', 'Plant cell': 'የዕፅዋት ሕዋስ', 'Click an organ': 'አንድ የአካል ክፍል ይጫኑ', 'Click a part of the cell': 'የሕዋሱን አንድ ክፍል ይጫኑ', 'Click a chamber': 'አንድ ክፍል ይጫኑ',
  'Start again': 'እንደገና ጀምር', 'Add a catalyst (lowers the energy needed)': 'ካታሊስት ጨምር (የሚያስፈልገውን ኃይል ይቀንሳል)', 'Hint': 'ፍንጭ', 'Next reaction →': 'ቀጣይ ምላሽ →', '← Previous': '← ቀዳሚ',
  'Physics': 'ፊዚክስ',
  'Electricity and mechanics: build circuits, launch projectiles, swing pendulums and push boxes to discover the laws of motion and energy.': 'ኤሌክትሪክና መካኒክስ፡ ዑደቶችን ሥሩ፣ ነገሮችን ወርውሩ፣ ፔንዱለም አወዛውዙ፣ ሳጥኖችን ግፉ፤ የእንቅስቃሴና የኃይል ሕጎችን ፈልጉ።',
  'Explore the human body, the beating heart and the cell, and watch populations and molecules change.': 'የሰውን አካል፣ የሚመታውን ልብና ሕዋስን ዳስሱ፤ የሕዝብ ብዛትና ሞለኪውሎች ሲለወጡ ተመልከቱ።',
  'Mix chemicals, watch reactions happen particle by particle, and balance chemical equations.': 'ኬሚካሎችን ቀላቅሉ፣ ምላሾችን በቅንጣት ደረጃ ተመልከቱ፣ የኬሚካል እኩልታዎችን አመጣጥኑ።',

  // footer and guide
  'Guide for teachers and admins': 'ለመምህራንና ለአስተዳዳሪዎች መመሪያ', 'Site setup and check': 'የድረ-ገጹ ማዋቀሪያና ፍተሻ',
  'Page not found': 'ገጹ አልተገኘም', 'Go home': 'ወደ ዋና ገጽ', 'Not available': 'አይገኝም', 'Go to my dashboard': 'ወደ ዳሽቦርዴ ሂድ'
};
// text with numbers or names inside: [pattern, Amharic with $1, $2…] (captured words are translated too when they are in the list)
const PATTERNS = [
  [/^Hello, (.+)$/, 'ሰላም፣ $1'], [/^(\d+) of (\d+) labs completed$/, 'ከ$2 ቤተ ሙከራዎች $1 ተጠናቀዋል'], [/^(\d+) labs$/, '$1 ቤተ ሙከራዎች'],
  [/^(.+) lab$/, 'የ$1 ቤተ ሙከራ'], [/^Go to (.+) labs →$/, 'ወደ $1 ቤተ ሙከራዎች →'], [/^Start with (.+)$/, 'በ$1 ይጀምሩ'],
  [/^(\d+) of (\d+) answered$/, 'ከ$2 ጥያቄዎች $1 ተመልሰዋል'], [/^Score: (\d+) of (\d+)$/, 'ውጤት፡ ከ$2 $1'], [/^In progress · (.+)$/, 'በሂደት ላይ · $1'],
  [/^(\d+) questions$/, '$1 ጥያቄዎች'], [/^(\d+) lessons$/, '$1 ትምህርቶች'], [/^(\d+) of (\d+) lessons done$/, 'ከ$2 ትምህርቶች $1 ተጠናቀዋል'],
  [/^(\d+) min$/, '$1 ደቂቃ'], [/^(\d+):(\d\d) left$/, '$1:$2 ቀርቷል'], [/^Next: (.+)\. (.+)\.$/, 'ቀጣይ፡ $1። $2።']
];

const SKIP = 'script,style,textarea,pre,code,.ed,.console,.tmsgs,.certificate,[data-noi18n],.notice h3,.notice p,input';
const ATTRS = ['placeholder', 'aria-label', 'title'];
let lang = 'en';
try { lang = localStorage.getItem('dscLang') || 'en'; } catch (e) {}

const tr = s => {
  const k = s.trim(); if (!k) return null;
  if (Object.prototype.hasOwnProperty.call(AM, k)) return AM[k];
  for (const [re, out] of PATTERNS) { const m = re.exec(k); if (m) return out.replace(/\$(\d)/g, (_, i) => AM[m[i]] || m[i]); }
  return null;
};
const skip = el => el && el.closest && el.closest(SKIP);
const doText = n => {
  if (skip(n.parentElement)) return;
  const orig = n.__en != null ? n.__en : n.nodeValue;
  const t = tr(orig);
  if (t == null) return;
  n.__en = orig;
  const v = orig.replace(orig.trim(), t);
  if (n.nodeValue !== v) n.nodeValue = v;
};
const doAttrs = el => { if (skip(el.parentElement) && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return; ATTRS.forEach(a => { if (!el.hasAttribute(a)) return; const key = '__en_' + a; const orig = el[key] != null ? el[key] : el.getAttribute(a); const t = tr(orig); if (t != null) { el[key] = orig; el.setAttribute(a, t); } }); };
const walk = root => {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1 || skip(root)) { if (root.nodeType === 1 && (root.tagName === 'INPUT' || root.tagName === 'TEXTAREA')) doAttrs(root); return; }
  doAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
};
const restore = () => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3 && n.__en != null) { n.nodeValue = n.__en; n.__en = null; }
    else if (n.nodeType === 1) ATTRS.forEach(a => { if (n['__en_' + a] != null) { n.setAttribute(a, n['__en_' + a]); n['__en_' + a] = null; } });
  }
};
const obs = new MutationObserver(ms => { if (lang !== 'am') return; ms.forEach(m => m.addedNodes.forEach(walk)); });

STEM.i18n = {
  get lang() { return lang; },
  t: s => lang === 'am' ? (tr(s) ?? s) : s,
  set(l) {
    lang = l === 'am' ? 'am' : 'en';
    try { localStorage.setItem('dscLang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    if (lang === 'am') { walk(document.body); obs.observe(document.body, { childList: true, subtree: true }); }
    else { obs.disconnect(); restore(); }
    document.querySelectorAll('.langbtn').forEach(b => b.textContent = lang === 'am' ? 'English' : 'አማርኛ');
  },
  dict: AM
};

/* ---------- Day / night mode ---------- */
let theme = 'auto';
try { theme = localStorage.getItem('dscTheme') || 'auto'; } catch (e) {}
const applyTheme = () => {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('.themebtn').forEach(b => { b.textContent = dark ? '☀' : '☾'; b.title = dark ? 'Switch to day mode' : 'Switch to night mode'; b.setAttribute('aria-label', b.title); });
};
STEM.theme = {
  toggle() { const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); theme = dark ? 'light' : 'dark'; try { localStorage.setItem('dscTheme', theme); } catch (e) {} applyTheme(); },
  apply: applyTheme
};
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* The two buttons work on their own, even before the rest of the site has loaded. */
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('.themebtn, .langbtn');
  if (!t) return;
  e.preventDefault();
  if (t.classList.contains('themebtn')) STEM.theme.toggle();
  else STEM.i18n.set(lang === 'am' ? 'en' : 'am');
});
const start = () => { applyTheme(); if (lang === 'am') STEM.i18n.set('am'); else document.querySelectorAll('.langbtn').forEach(b => b.textContent = 'አማርኛ'); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
