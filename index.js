const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  PermissionsBitField 
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// 🔹 IDs
const TICKET_ROLE_ID = "ID_Galaxy_RP_Ticket_Team";   
const BLACKLIST_ROLE_ID = "ID_BlackListed";           
const TICKET_MG_ROLE_ID = "ID_Ticket_MG";            
const TICKET_CATEGORY_ID = "ID_الكيتجوري";           

let userTickets = new Map(); 
let ticketCounters = { 
  "استفسارات": 0,
  "شكوى_ادارة": 0,
  "نقل_سيريال": 0,
  "شكوى_خاصة": 0
};

// جاهزية البوت
client.once("ready", () => {
  console.log(`${client.user.tag} جاهز ✅`);
  client.user.setPresence({
    status: "dnd",
    activities: [{ name: "Galaxy RP Ticket System" }]
  });
});

// أسئلة التكت
function getQuestions(type) {
  const questions = {
    "استفسارات":[
      { id:"q1", label:"اسمك في السيرفر", style:TextInputStyle.Short, required:true },
      { id:"q2", label:"ايديك", style:TextInputStyle.Short, required:true },
      { id:"q3", label:"استفسارك", style:TextInputStyle.Paragraph, required:true },
      { id:"q4", label:"هل هو مستعجل؟", style:TextInputStyle.Short, required:false },
      { id:"q5", label:"هل تحتاج تواصل صوتي؟", style:TextInputStyle.Short, required:false },
      { id:"q6", label:"ملاحظات إضافية", style:TextInputStyle.Paragraph, required:false }
    ],
    "شكوى_ادارة":[
      { id:"q1", label:"اسمك في السيرفر", style:TextInputStyle.Short, required:true },
      { id:"q2", label:"ايديك", style:TextInputStyle.Short, required:true },
      { id:"q3", label:"اسم الاداري المشتكى عليه", style:TextInputStyle.Short, required:true },
      { id:"q4", label:"تفاصيل الشكوى", style:TextInputStyle.Paragraph, required:true },
      { id:"q5", label:"وقت الحادثة", style:TextInputStyle.Short, required:true },
      { id:"q6", label:"أدلة (روابط/صور)", style:TextInputStyle.Short, required:false }
    ],
    "نقل_سيريال":[
      { id:"q1", label:"اسمك في السيرفر", style:TextInputStyle.Short, required:true },
      { id:"q2", label:"ايديك", style:TextInputStyle.Short, required:true },
      { id:"q3", label:"السيريال القديم", style:TextInputStyle.Short, required:true },
      { id:"q4", label:"السيريال الجديد", style:TextInputStyle.Short, required:true },
      { id:"q5", label:"سبب النقل", style:TextInputStyle.Paragraph, required:true },
      { id:"q6", label:"ملاحظات إضافية", style:TextInputStyle.Paragraph, required:false }
    ],
    "شكوى_خاصة":[
      { id:"q1", label:"اسمك في السيرفر", style:TextInputStyle.Short, required:true },
      { id:"q2", label:"ايديك", style:TextInputStyle.Short, required:true },
      { id:"q3", label:"موضوع الشكوى", style:TextInputStyle.Short, required:true },
      { id:"q4", label:"تفاصيل الشكوى", style:TextInputStyle.Paragraph, required:true },
      { id:"q5", label:"وقت الحادثة", style:TextInputStyle.Short, required:true },
      { id:"q6", label:"ملاحظات إضافية", style:TextInputStyle.Paragraph, required:false }
    ]
  };
  return questions[type] || [];
}

// أمر التكت
client.on("messageCreate", async message => {
  if (message.content === "(تكت)") {
    if (!message.member.roles.cache.has(TICKET_MG_ROLE_ID)) return;

    const embed = new EmbedBuilder()
      .setTitle("Galaxy RP Ticket System")
      .setDescription("مرحبا بك في نظام الشكوى في خادم **Galaxy**\nالرجاء اختيار نوع الشكوى من الأزرار بالأسفل\n**ملاحظة : اختر نوع الشكوى المناسبة لتجنب أي مشاكل مع الإدارة**")
      .setColor("Purple")
      .setThumbnail("https://cdn.discordapp.com/attachments/1407427459837722665/1408113949957689478/logo.png")
      .setImage("https://cdn.discordapp.com/attachments/1407427459837722665/1408113949957689478/logo.png")
      .setFooter({ text: "Galaxy RP Ticket System V2.0" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("استفسارات").setLabel("استفسارات عامة").setStyle(ButtonStyle.Primary).setEmoji("❓"),
      new ButtonBuilder().setCustomId("شكوى_ادارة").setLabel("شكوى الإدارة").setStyle(ButtonStyle.Danger).setEmoji("⚠️"),
      new ButtonBuilder().setCustomId("نقل_سيريال").setLabel("طلب نقل سيريال").setStyle(ButtonStyle.Success).setEmoji("💻"),
      new ButtonBuilder().setCustomId("شكوى_خاصة").setLabel("شكوى خاصة").setStyle(ButtonStyle.Secondary).setEmoji("🔒")
    );

    await message.channel.send({ embeds:[embed], components:[row] });
  }
});

// عند الضغط على زر
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  const member = interaction.member;

  if (member.roles.cache.has(BLACKLIST_ROLE_ID)) 
    return interaction.reply({ content:"❌ أنت ممنوع من فتح التكتات.", ephemeral:true });

  if (userTickets.has(member.id))
    return interaction.reply({ content:"❌ لديك تكت مفتوح بالفعل، أغلقه أولاً.", ephemeral:true });

  const type = interaction.customId;

  const modal = new ModalBuilder()
    .setCustomId(`form_${type}`)
    .setTitle(`استمارة - ${type}`);

  getQuestions(type).forEach(q=>{
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(q.label)
          .setStyle(q.style)
          .setRequired(q.required)
      )
    );
  });

  await interaction.showModal(modal);
});

// بعد إرسال الفورم
client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

  const member = interaction.member;
  const type = interaction.customId.replace("form_","");

  ticketCounters[type] = (ticketCounters[type]||0)+1;
  const channelName = `${type}-${ticketCounters[type]}`;

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: 0,
    parent: TICKET_CATEGORY_ID,
    permissionOverwrites:[
      { id: interaction.guild.id, deny:[PermissionsBitField.Flags.ViewChannel] },
      { id: member.id, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] },
      { id: TICKET_ROLE_ID, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] }
    ]
  });

  userTickets.set(member.id, channel.id);

  let answers = "";
  getQuestions(type).forEach(q=>{
    answers += `**${q.label}:** ${interaction.fields.getTextInputValue(q.id) || "لا يوجد"}\n`;
  });

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("اغلاق").setLabel("🔒 اغلاق التكت").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ 
    content:`👋 مرحبًا <@${member.id}>، يرجى الانتظار حتى يرد عليك أحد أعضاء فريق <@&${TICKET_ROLE_ID}>.`,
    embeds:[ new EmbedBuilder()
      .setTitle(`📩 ${type}`)
      .setDescription(answers)
      .setColor("Purple")
      .setImage("https://cdn.discordapp.com/attachments/1407427459837722665/1408113949957689478/logo.png")
      .setFooter({ text:`Galaxy RP Ticket System V2.0 | نوع: ${type}` })
    ],
    components:[closeButton]
  });

  await interaction.reply({ content:`✅ تم فتح التكت: ${channel}`, ephemeral:true });
});

// زر اغلاق التكت
client.on("interactionCreate", async interaction=>{
  if(!interaction.isButton() || interaction.customId!=="اغلاق") return;

  const member = interaction.member;
  if(!member.roles.cache.has(TICKET_ROLE_ID)) 
    return interaction.reply({ content:"❌ لا يمكنك اغلاق التكت.", ephemeral:true });

  const channel = interaction.channel;
  userTickets.forEach((v,k)=>{ if(v===channel.id) userTickets.delete(k); });

  await channel.send({ content:"🔒 تم اغلاق التكت من قبل الفريق." });
  setTimeout(()=>channel.delete(), 3000);
});

// 🔹 تشغيل البوت
client.login(process.env.TOKEN);
