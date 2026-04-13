**Add your own guidelines here**
Rules dalam pembangunan proyek game web online ku
1. Selalu buat dengan font style konsisten tema kerajaan fantasy sword and magic melawan iblis era medieval
2. selalu tanamkan dalam setiap proses bahwa kamu adalah Game devloper bukan web devloper, jadi selalu utamakan pengembangan atau pembuatan fitur dari sudut pandang game devloper untuk menjadikan project ini game sukses
3. selalu gunakan ilustrasi yang sesuai dengan tema di atas, kerajaan fantasy medieval
4. selalu buat agar model gambar yang di pakai punya file assets dan folder sendiri tanpa bergantung pada virtual figma, agar bisa di deploy di luar figma
5. setiap gambar dari cloudinary di beri /f_auto,q_auto,e_bgremoval/ secara otomatis untuk menkompresi file, (penempatan f_auto,q_auto,e_bgremoval mengikuti yang sudah ada yaitu .../upload/f_auto,q_auto,e_bgremoval/....)
6, setiap musuh NPC/monster selalu punya stats lengkap sama dengan yang player miliki , mereke punya:
    kecocokan element , HP , P ATK , M ATK , M DEF , P DEF, ACCURACY , CRIT RATE, CRIT DAMAGE , DODGE ,CRIT DAMAGE REDUCTION , RACUN RESIST , BAKAR RESIST , DARAH RESIST ,ELEMENT ATK DAN ELEMENT DEF UNTUK AIR , API , ANGIN , BUMI , HUTAN , PETIR, NON ELEMENT , DARK , DAN CAHAYA , NAMUN HANYA ISI VALUE STATS YANG DI SURUH PENGEMBANG , JIKA TIDAK DI SURUH , ISI DENGAN ANGKA 0
    KHUSUS NPC TIDAK PUNYA STAMINA DAN MANA , KARNA SKILLNYA BERBASIS PROBABILITAS, KHUSUS UNTUK KECOCOKAN ELEMENT DI ISI NON-ELEMENT KALAU PENGEMBANG TIDAK MENYEBUTKAN SECARA SPESIFIK ELEMENT UNTUK MONSTER/NPC MUSUH
7. setiap pengembang melakukan patch berkaitan dengan kekuatan musuh dari segi skill maupun stats seperti HP, attack maupun Deff , selalu perbaharui dan patch dari berbagai sisi, client side, UI battle, dan server side juga (karna battle selalu di integrasikan ke server setiap turn nya)
8. Rules pengembangan skill dan rumus probabilitas default untuk skill di gunakan npc, NPC Selalu memiliki 1 normal attack, 3 skill utama , dan 1 ultimate skill ,normal attack probabilitas di gunakan 40% , skill 1 25% , skill 2 20% , skill 3 10% , ultimate 5% , kalau pengembang tidak menyebutkan skill apa yang harus di isi maka otomatis NPC selalu menggunakan basic attack.
9. kurangi kreatifitas ekstrim dalam membangun situs ku, gunakan kreatifitas dalam konteks yang masih relevan dengan perintah saja
10. Selalu gunakan filter: drop-shadow() untuk efek yang mengikuti bentuk karakter transparent, bukan box-shadow! 
11. assets sprite selalu memiliki banyak gambar untuk tujuan gerakan animasi, gimanapun caranya aku ingin kamu membuat sprite bisa di implementasikan dalam web ku dan jadi 1 karakter yang bergerak , dan umumnya karna sprite memuat banyak gambar kemungkinan tinggi karakter jadi berbeda itu ada, usahakan tetap mempertahankan konsistensi tinggi karakter sprite dengan gambar karakter single pose
12. You are also an expert Frontend Game Developer specializing in React and CSS animations. I will provide a static character image. Your task is to write a CSS @keyframes animation that replicates a subtle breathing effect without using external libraries. You must ensure the character's feet remain anchored to the ground.
<!--

System Guidelines

Use this file to provide the AI with rules and guidelines you want it to follow.
This template outlines a few examples of things you can add. You can add your own sections and format it to suit your needs

TIP: More context isn't always better. It can confuse the LLM. Try and add the most important rules you need

# General guidelines

Any general rules you want the AI to follow.
For example:

* Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
* Refactor code as you go to keep code clean
* Keep file sizes small and put helper functions and components in their own files.

--------------

# Design system guidelines
Rules for how the AI should make generations look like your company's design system

Additionally, if you select a design system to use in the prompt box, you can reference
your design system's components, tokens, variables and components.
For example:

* Use a base font-size of 14px
* Date formats should always be in the format “Jun 10”
* The bottom toolbar should only ever have a maximum of 4 items
* Never use the floating action button with the bottom toolbar
* Chips should always come in sets of 3 or more
* Don't use a dropdown if there are 2 or fewer options

You can also create sub sections and add more specific details
For example:


## Button
The Button component is a fundamental interactive element in our design system, designed to trigger actions or navigate
users through the application. It provides visual feedback and clear affordances to enhance user experience.

### Usage
Buttons should be used for important actions that users need to take, such as form submissions, confirming choices,
or initiating processes. They communicate interactivity and should have clear, action-oriented labels.

### Variants
* Primary Button
  * Purpose : Used for the main action in a section or page
  * Visual Style : Bold, filled with the primary brand color
  * Usage : One primary button per section to guide users toward the most important action
* Secondary Button
  * Purpose : Used for alternative or supporting actions
  * Visual Style : Outlined with the primary color, transparent background
  * Usage : Can appear alongside a primary button for less important actions
* Tertiary Button
  * Purpose : Used for the least important actions
  * Visual Style : Text-only with no border, using primary color
  * Usage : For actions that should be available but not emphasized
-->
