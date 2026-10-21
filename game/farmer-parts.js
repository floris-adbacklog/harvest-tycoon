// The parts a farmer can wear, and which go together (20 Oct 2026, the owner: "Doe 2"): ithappy Studios' Creative Characters pack,
// cut into one file a part by scripts/build-farmer.mjs (which also fills the block between the markers below with what it measured).
// Pure rules, no imports: farm-state.js imports it beside itself (game/, and the copies scripts/sync-game.mjs makes in public/ and
// farm-api), so the page and the server check a farmer the same way before it is saved (the farm action farmer_wear). The names are
// working names: no screen shows them (My farmer shows pictures).
//
// A farmer is a small object, one part id per slot: {body, face, hair, hat, glasses, faceExtra, top, bottom, outfit, costume, mascot,
// shoes, socks, gloves}. Body and face are always there; every other slot may be left out (bald, bare feet, ...).
// The pack's groups, the slot each goes in, and whether a farmer gets it for free or earns it (the owner, 20 Oct 2026: bodies, faces,
// hairstyles and ordinary clothes are free; hats, costumes and mascots are earned with levels, goals and passes).
export const FARMER_GROUPS=Object.freeze({
 body:{slot:'body',earned:false,pack:'Body'},             // the whole farmer, bald and barefoot: 16 colours of one body (5 skin tones)
 face:{slot:'face',earned:false,pack:'Faces'},            // eyes, brows, nose and mouth on the body's head: 80 (moods in 4 styles, two sets)
 hair:{slot:'hair',earned:false,pack:'Hairstyle'},        // short hair that fits under a hat
 hairFull:{slot:'hair',earned:false,pack:'Hairstyle Single'},  // big hair (buns, afros, long hair): a hat would cut through it
 hat:{slot:'hat',earned:true,pack:'Hat'},
 helmet:{slot:'hat',earned:true,pack:'Hat Single'},       // hoods, helmets and masks that cover the whole head
 glasses:{slot:'glasses',earned:false,pack:'Glasses'},
 faceExtra:{slot:'faceExtra',earned:false,pack:'Face Accessories'},  // beards, mustaches, earrings, a clown nose, ...
 top:{slot:'top',earned:false,pack:'Outwear'},
 pants:{slot:'bottom',earned:false,pack:'Pants'},
 shorts:{slot:'bottom',earned:false,pack:'Shorts'},
 outfit:{slot:'outfit',earned:false,pack:'Outfit'},       // a top and a bottom in one: dungarees, dresses, a skirt and blouse
 costume:{slot:'costume',earned:true,pack:'Costumes'},    // head to toe (shoes and gloves included): pirate, bee, knight, ...
 mascot:{slot:'mascot',earned:true,pack:'Mascots'},       // a big suit over head and body; arms and legs stay the farmer's own
 shoes:{slot:'shoes',earned:false,pack:'Shoes'},
 socks:{slot:'socks',earned:false,pack:'Socks'},
 gloves:{slot:'gloves',earned:false,pack:'Gloves'}
});
export const FARMER_SLOTS=Object.freeze(['body','face','hair','hat','glasses','faceExtra','top','bottom','outfit','costume','mascot','shoes','socks','gloves']);
export const REQUIRED_SLOTS=Object.freeze(['body','face']);
// What cannot be worn together, as the pack itself was made (checked on the models, 20 Oct 2026): a group, and the groups it leaves no
// room for. The other way round holds too (a hat leaves no room for big hair).
export const FARMER_RULES=Object.freeze([
 ['outfit',['top','pants','shorts']],                       // an outfit is a top and a bottom in one
 ['hairFull',['hat','helmet']],                             // big hair pokes through every hat
 ['helmet',['hair','hairFull']],                            // a hood, helmet or mask covers the whole head
 ['costume',['hair','hairFull','hat','helmet','top','pants','shorts','outfit','mascot','shoes','socks','gloves']],  // head to toe
 ['mascot',['hair','hairFull','hat','helmet','top','outfit']]   // over head and body; trousers, shoes, socks and gloves still show
].map(([group,blocks])=>Object.freeze([group,Object.freeze(blocks)])));
// And one more: a helmet or costume that covers the face (a pumpkin, a diving helmet, the astronaut) leaves no room for glasses or
// face extras (they would stick out through it). coversFace below.

// <measured by scripts/build-farmer.mjs>
// [id, group, style (the part it is another colour of), files, bytes, colour, other materials]
const MEASURED=[
["body_001","body","","body_001",37700,"#d5dbde",""],
["body_002","body","body_001","body_002",37148,"#697074",""],
["body_003","body","body_001","body_003",37000,"#2a2b2c",""],
["body_004","body","body_001","body_004",37452,"#e23637",""],
["body_005","body","body_001","body_005",37148,"#e9581e",""],
["body_006","body","body_001","body_006",37108,"#ffbc0c",""],
["body_007","body","body_001","body_007",37784,"#88b83f",""],
["body_008","body","body_001","body_008",37188,"#03acdf",""],
["body_009","body","body_001","body_009",37816,"#fba860",""],
["body_010","body","body_001","body_010",38168,"#f6945c",""],
["body_011","body","body_001","body_011",37652,"#df7153",""],
["body_012","body","body_001","body_012",37396,"#9a553f",""],
["body_013","body","body_001","body_013",37376,"#50332c",""],
["body_014","body","body_001","body_014",36976,"#e43c79",""],
["body_015","body","body_001","body_015",36920,"#6c209d",""],
["body_016","body","body_001","body_016",37292,"#3545a9",""],
["costume_1","costume","","costume_1_001+costume_1_002",48796,"#7647b7",""],
["costume_2","costume","","costume_2_001+costume_2_002",50548,"#7a5f38",""],
["costume_3","costume","","costume_3_001+costume_3_002",62416,"#9e897c",""],
["costume_4","costume","","costume_4_001+costume_4_002",54572,"#b76437",""],
["costume_5","costume","","costume_5_001+costume_5_002",54436,"#9e5b5c",""],
["costume_6","costume","","costume_6_001",47308,"#915d35","farmer-glow"],
["costume_7","costume","","costume_7_001+costume_7_002+costume_7_003",51160,"#c95917",""],
["costume_8","costume","","costume_8_001+costume_8_002+costume_8_003+costume_8_004",80084,"#888a8c","farmer-glow"],
["costume_9","costume","","costume_9_001+costume_9_002+costume_9_003",67704,"#242627","farmer-glow"],
["costume_10","costume","","costume_10_001",46136,"#926933",""],
["costume_11","costume","","costume_11_001+costume_11_002+costume_11_003",76512,"#696e71",""],
["costume_12","costume","","costume_12_001+costume_12_002",155296,"#7b8b54",""],
["costume_13","costume","","costume_13_001+costume_13_002",48756,"#ac7a32",""],
["costume_14","costume","","costume_14_001+costume_14_002+costume_14_003",64720,"#639146",""],
["female_emotion_anger_001","face","","female_emotion_anger_001",7580,"#84464d",""],
["female_emotion_anger_002","face","","female_emotion_anger_002",8568,"#632d30",""],
["female_emotion_anger_003","face","","female_emotion_anger_003",11296,"#5f5152",""],
["female_emotion_anger_004","face","","female_emotion_anger_004",10460,"#957979",""],
["female_emotion_angry_001","face","","female_emotion_angry_001",8564,"#61292c",""],
["female_emotion_angry_002","face","","female_emotion_angry_002",8248,"#703f45",""],
["female_emotion_angry_003","face","","female_emotion_angry_003",7784,"#424243",""],
["female_emotion_angry_004","face","","female_emotion_angry_004",9984,"#907a7a",""],
["female_emotion_compassion_003","face","","female_emotion_compassion_003",10456,"#6f4949",""],
["female_emotion_compassion_004","face","","female_emotion_compassion_004",10628,"#8f7e7d",""],
["female_emotion_confuse_001","face","","female_emotion_confuse_001",7744,"#643c40",""],
["female_emotion_confuse_002","face","","female_emotion_confuse_002",8020,"#56292b",""],
["female_emotion_confuse_003","face","","female_emotion_confuse_003",9876,"#8f7a7a",""],
["female_emotion_evil_001","face","","female_emotion_evil_001",8512,"#60292c",""],
["female_emotion_evil_002","face","","female_emotion_evil_002",8228,"#703f45",""],
["female_emotion_evil_003","face","","female_emotion_evil_003",8960,"#4d4748",""],
["female_emotion_evil_004","face","","female_emotion_evil_004",11172,"#9d7979",""],
["female_emotion_happy_001","face","","female_emotion_happy_001",8196,"#65282b",""],
["female_emotion_happy_002","face","","female_emotion_happy_002",8344,"#6a3c41",""],
["female_emotion_happy_003","face","","female_emotion_happy_003",8948,"#4d4748",""],
["female_emotion_happy_004","face","","female_emotion_happy_004",11100,"#9d7979",""],
["female_emotion_impatience_001","face","","female_emotion_impatience_001",8388,"#6a3c41",""],
["female_emotion_impatience_002","face","","female_emotion_impatience_002",8276,"#66282b",""],
["female_emotion_madness_003","face","","female_emotion_madness_003",8412,"#5c3f40",""],
["female_emotion_neutral_001","face","","female_emotion_neutral_001",8528,"#61292c",""],
["female_emotion_neutral_002","face","","female_emotion_neutral_002",8208,"#703f45",""],
["female_emotion_neutral_003","face","","female_emotion_neutral_003",7716,"#424344",""],
["female_emotion_neutral_004","face","","female_emotion_neutral_004",9852,"#8f7a7a",""],
["female_emotion_sad_001","face","","female_emotion_sad_001",8472,"#61292c",""],
["female_emotion_sad_002","face","","female_emotion_sad_002",8228,"#703f45",""],
["female_emotion_sad_003","face","","female_emotion_sad_003",7668,"#424344",""],
["female_emotion_sad_004","face","","female_emotion_sad_004",9832,"#8f7a7a",""],
["female_emotion_surprised_001","face","","female_emotion_surprised_001",8240,"#744247",""],
["female_emotion_surprised_002","face","","female_emotion_surprised_002",8500,"#632d30",""],
["female_emotion_surprised_003","face","","female_emotion_surprised_003",11128,"#5c5253",""],
["female_emotion_surprised_004","face","","female_emotion_surprised_004",11308,"#957c7c",""],
["female_emotion_usual_001","face","","female_emotion_usual_001",8456,"#60292c",""],
["female_emotion_usual_002","face","","female_emotion_usual_002",8204,"#703f45",""],
["female_emotion_usual_003","face","","female_emotion_usual_003",7692,"#424243",""],
["female_emotion_usual_004","face","","female_emotion_usual_004",9860,"#8f7a7a",""],
["male_emotion_anger_001","face","","male_emotion_anger_001",6956,"#3b3030",""],
["male_emotion_anger_002","face","","male_emotion_anger_002",7368,"#352d2e",""],
["male_emotion_anger_003","face","","male_emotion_anger_003",10692,"#675354",""],
["male_emotion_anger_004","face","","male_emotion_anger_004",7860,"#b3887d",""],
["male_emotion_angry_001","face","","male_emotion_angry_001",7048,"#262627",""],
["male_emotion_angry_002","face","","male_emotion_angry_002",6524,"#2f2c2c",""],
["male_emotion_angry_003","face","","male_emotion_angry_003",6992,"#4c4d4d",""],
["male_emotion_angry_004","face","","male_emotion_angry_004",7236,"#ab8b81",""],
["male_emotion_compassion_003","face","","male_emotion_compassion_003",10140,"#705850",""],
["male_emotion_compassion_004","face","","male_emotion_compassion_004",9128,"#ad9a95",""],
["male_emotion_confuse_001","face","","male_emotion_confuse_001",6568,"#2f2c2c",""],
["male_emotion_confuse_002","face","","male_emotion_confuse_002",7000,"#262627",""],
["male_emotion_confuse_004","face","","male_emotion_confuse_004",7200,"#ab8b81",""],
["male_emotion_evil_001","face","","male_emotion_evil_001",7072,"#262627",""],
["male_emotion_evil_002","face","","male_emotion_evil_002",6520,"#2f2c2c",""],
["male_emotion_evil_003","face","","male_emotion_evil_003",8276,"#544e4f",""],
["male_emotion_evil_004","face","","male_emotion_evil_004",8500,"#b38578",""],
["male_emotion_happy_001","face","","male_emotion_happy_001",7152,"#2a2828",""],
["male_emotion_happy_002","face","","male_emotion_happy_002",7208,"#252526",""],
["male_emotion_happy_003","face","","male_emotion_happy_003",8260,"#564e4f",""],
["male_emotion_happy_004","face","","male_emotion_happy_004",8512,"#b38578",""],
["male_emotion_impatience_001","face","","male_emotion_impatience_001",7180,"#2a2828",""],
["male_emotion_impatience_002","face","","male_emotion_impatience_002",7228,"#252526",""],
["male_emotion_madness_003","face","","male_emotion_madness_003",7748,"#654344",""],
["male_emotion_neutral_001","face","","male_emotion_neutral_001",6832,"#262727",""],
["male_emotion_neutral_002","face","","male_emotion_neutral_002",6496,"#2f2c2c",""],
["male_emotion_neutral_003","face","","male_emotion_neutral_003",6620,"#4d4f50",""],
["male_emotion_neutral_004","face","","male_emotion_neutral_004",6732,"#a5908a",""],
["male_emotion_sad_001","face","","male_emotion_sad_001",6524,"#2f2c2c",""],
["male_emotion_sad_002","face","","male_emotion_sad_002",7040,"#262627",""],
["male_emotion_sad_003","face","","male_emotion_sad_003",7288,"#494a4b",""],
["male_emotion_sad_004","face","","male_emotion_sad_004",7216,"#ab8b81",""],
["male_emotion_surprised_001","face","","male_emotion_surprised_001",7324,"#332e2e",""],
["male_emotion_surprised_002","face","","male_emotion_surprised_002",7104,"#3b3131",""],
["male_emotion_surprised_003","face","","male_emotion_surprised_003",10456,"#645555",""],
["male_emotion_surprised_004","face","","male_emotion_surprised_004",9804,"#b29790",""],
["male_emotion_usual_001","face","","male_emotion_usual_001",6524,"#2f2c2c",""],
["male_emotion_usual_002","face","","male_emotion_usual_002",7060,"#262627",""],
["male_emotion_usual_003","face","","male_emotion_usual_003",6992,"#4b4c4d",""],
["male_emotion_usual_004","face","","male_emotion_usual_004",7240,"#ab8b81",""],
["beard_001","faceExtra","","beard_001",5876,"#5a4a45",""],
["beard_002","faceExtra","","beard_002",6360,"#5c4b46",""],
["beard_003","faceExtra","","beard_003",6540,"#54433f",""],
["clown_nose_001","faceExtra","","clown_nose_001",5308,"#d53030",""],
["earrings_001","faceExtra","","earrings_001",5396,"#fb7f0a",""],
["headphones_002","faceExtra","","headphones_002",5952,"#f4f5f6",""],
["mask_001","faceExtra","","mask_001",6748,"#96d9fa",""],
["mask_002","faceExtra","","mask_002",5432,"#262627",""],
["mustache_001","faceExtra","","mustache_001",4504,"#4a3c39",""],
["mustache_002","faceExtra","","mustache_002",5116,"#554641",""],
["mustache_003","faceExtra","","mustache_003",6176,"#584844",""],
["mustache_004","faceExtra","","mustache_004",6288,"#584944",""],
["mustache_005","faceExtra","","mustache_005",5024,"#574944",""],
["mustache_006","faceExtra","","mustache_006",6480,"#584945",""],
["mustache_007","faceExtra","","mustache_007",7400,"#574944",""],
["mustache_008","faceExtra","","mustache_008",6476,"#574944",""],
["mustache_009","faceExtra","","mustache_009",6524,"#574944",""],
["mustache_010","faceExtra","","mustache_010",9380,"#574944",""],
["mustache_011","faceExtra","","mustache_011",7032,"#574944",""],
["mustache_012","faceExtra","","mustache_012",4980,"#574944",""],
["mustache_013","faceExtra","","mustache_013",6140,"#584944",""],
["mustache_014","faceExtra","","mustache_014",6120,"#574944",""],
["mustache_015","faceExtra","","mustache_015",5768,"#574944",""],
["pacifier_001","faceExtra","","pacifier_001",7540,"#ed6c92",""],
["piercing_001","faceExtra","","piercing_001",4556,"#c7c8c8",""],
["bandage_001","glasses","","bandage_001",7272,"#252525",""],
["glasses_002","glasses","","glasses_002",18792,"#d8d9d9",""],
["glasses_003","glasses","","glasses_003",8600,"#262627","farmer-glass"],
["glasses_004","glasses","","glasses_004",16640,"#dc3531",""],
["glasses_005","glasses","","glasses_005",12980,"#574946","farmer-glass"],
["glasses_006","glasses","","glasses_006",15704,"#fc951e","farmer-glass"],
["glasses_007","glasses","","glasses_007",10612,"#49555a",""],
["glasses_008","glasses","","glasses_008",5960,"#f87611",""],
["glasses_009","glasses","","glasses_009",8464,"#05aac6",""],
["glasses_010","glasses","","glasses_010",15216,"#28292a","farmer-glass"],
["glasses_011","glasses","","glasses_011",13612,"#f2f2f3","farmer-glass"],
["glasses_012","glasses","","glasses_012",17172,"#ca7141",""],
["glasses_013","glasses","","glasses_013",11716,"#343f46","farmer-glass"],
["glasses_014","glasses","","glasses_014",6600,"#3cb8f1",""],
["glasses_015","glasses","","glasses_015",11024,"#eceded","farmer-glass"],
["glasses_016","glasses","","glasses_016",11052,"#282d2f","farmer-glow"],
["glasses_017","glasses","","glasses_017",13520,"#282c2f","farmer-glow"],
["glasses_018","glasses","","glasses_018",9752,"#cb2a2b",""],
["glasses_019","glasses","","glasses_019",12544,"#79ad3f","farmer-glass"],
["glasses_020","glasses","","glasses_020",12928,"#e85084","farmer-glass"],
["glasses_021","glasses","","glasses_021",10348,"#d7dde0","farmer-glass"],
["gloves_001","gloves","","gloves_001",16800,"#02a7da",""],
["gloves_002","gloves","gloves_001","gloves_002",16740,"#d22e30",""],
["gloves_003","gloves","gloves_001","gloves_003",16816,"#bc68c3",""],
["gloves_004","gloves","","gloves_004",13396,"#ddad1b",""],
["gloves_005","gloves","gloves_004","gloves_005",13348,"#2b2b2c",""],
["gloves_006","gloves","gloves_004","gloves_006",13420,"#677f2d",""],
["gloves_007","gloves","gloves_004","gloves_007",13372,"#b9b7b7",""],
["gloves_008","gloves","","gloves_008",15096,"#25292c",""],
["gloves_009","gloves","","gloves_009",15636,"#ea581b",""],
["gloves_010","gloves","gloves_009","gloves_010",15704,"#5d6162",""],
["gloves_011","gloves","","gloves_011",17468,"#244473",""],
["gloves_012","gloves","gloves_011","gloves_012",17300,"#96a127",""],
["gloves_013","gloves","gloves_011","gloves_013",17388,"#689fcb",""],
["gloves_014","gloves","gloves_011","gloves_014",17384,"#802a2b",""],
["gloves_015","gloves","","gloves_015",15700,"#af414d",""],
["gloves_016","gloves","gloves_015","gloves_016",15700,"#2b508b",""],
["gloves_017","gloves","gloves_015","gloves_017",15700,"#484140",""],
["gloves_018","gloves","gloves_001","gloves_018",16744,"#ffc512",""],
["gloves_019","gloves","","gloves_019",18576,"#6a2122",""],
["gloves_020","gloves","","gloves_020",16480,"#242626",""],
["gloves_021","gloves","","gloves_021",16912,"#7c7d3c",""],
["gloves_022","gloves","gloves_021","gloves_022",16908,"#2a2a2c",""],
["gloves_023","gloves","gloves_021","gloves_023",16912,"#fa9a5f",""],
["hairstyle_female_001","hair","","hairstyle_female_001",15060,"#784a3b",""],
["hairstyle_female_002","hair","","hairstyle_female_002",11396,"#f17206",""],
["hairstyle_female_003","hair","","hairstyle_female_003",10180,"#36393b",""],
["hairstyle_female_004","hair","","hairstyle_female_004",7572,"#553a32",""],
["hairstyle_female_005","hair","","hairstyle_female_005",25096,"#727374",""],
["hairstyle_male_001","hair","","hairstyle_male_001",15692,"#664338",""],
["hairstyle_male_002","hair","","hairstyle_male_002",6036,"#fa8d05",""],
["hairstyle_male_003","hair","","hairstyle_male_003",8644,"#744f46",""],
["hairstyle_male_004","hair","","hairstyle_male_004",11264,"#cacbcb",""],
["hairstyle_male_005","hair","","hairstyle_male_005",10092,"#4e4644",""],
["hairstyle_male_006","hair","","hairstyle_male_006",16668,"#b25c4a",""],
["hairstyle_female_single_001","hairFull","","hairstyle_female_single_001",12540,"#1191e4",""],
["hairstyle_female_single_002","hairFull","","hairstyle_female_single_002",10532,"#5f433b",""],
["hairstyle_female_single_003","hairFull","","hairstyle_female_single_003",8988,"#675752",""],
["hairstyle_female_single_004","hairFull","","hairstyle_female_single_004",31632,"#6f6e6f",""],
["hairstyle_female_single_005","hairFull","","hairstyle_female_single_005",30048,"#60433a",""],
["hairstyle_female_single_006","hairFull","","hairstyle_female_single_006",18628,"#d05b5b",""],
["hairstyle_female_single_007","hairFull","","hairstyle_female_single_007",50492,"#61473f",""],
["hairstyle_male_single_001","hairFull","","hairstyle_male_single_001",8072,"#595251",""],
["hairstyle_male_single_002","hairFull","","hairstyle_male_single_002",18604,"#a6a2a1",""],
["hairstyle_male_single_003","hairFull","","hairstyle_male_single_003",14252,"#784a3b",""],
["hairstyle_male_single_004","hairFull","","hairstyle_male_single_004",5040,"#4d4341",""],
["hairstyle_male_single_005","hairFull","","hairstyle_male_single_005",47060,"#40484c",""],
["hairstyle_male_single_006","hairFull","","hairstyle_male_single_006",22732,"#5e3f38",""],
["hairstyle_male_single_007","hairFull","","hairstyle_male_single_007",13860,"#cabab5",""],
["hairstyle_male_single_008","hairFull","","hairstyle_male_single_008",6916,"#947f60",""],
["hat_001","hat","","hat_001",8912,"#5774b5",""],
["hat_002","hat","","hat_002",6472,"#fe944b",""],
["hat_003","hat","","hat_003",6704,"#ac5f46",""],
["hat_004","hat","","hat_004",13268,"#b1c167",""],
["hat_005","hat","","hat_005",6160,"#566c77",""],
["hat_006","hat","","hat_006",7476,"#2b2b2b",""],
["hat_007","hat","","hat_007",5472,"#d6383a",""],
["hat_008","hat","","hat_008",6652,"#7a6a65",""],
["hat_009","hat","","hat_009",6196,"#ffca65",""],
["hat_010","hat","","hat_010",9148,"#fbbe53",""],
["hat_011","hat","","hat_011",18284,"#d16e2a",""],
["hat_012","hat","","hat_012",16716,"#ef799a",""],
["hat_013","hat","","hat_013",19912,"#deb8b9",""],
["hat_014","hat","","hat_014",8540,"#ce8a67",""],
["hat_015","hat","","hat_015",10692,"#e79594",""],
["hat_016","hat","","hat_016",8840,"#b25144",""],
["hat_017","hat","","hat_017",19984,"#9a7a70",""],
["hat_018","hat","","hat_018",8080,"#e0a6a5",""],
["hat_019","hat","","hat_019",17232,"#dd7a18",""],
["hat_020","hat","","hat_020",10432,"#b7bdc1",""],
["hat_021","hat","","hat_021",12568,"#cb7833",""],
["hat_022","hat","","hat_022",7140,"#654c36",""],
["hat_023","hat","","hat_023",11320,"#c0c9cd",""],
["hat_024","hat","","hat_024",11288,"#618f2f",""],
["hat_025","hat","","hat_025",19876,"#deced1","farmer-glass"],
["hat_026","hat","","hat_026",7800,"#896475",""],
["hat_027","hat","","hat_027",26464,"#ae9fa4",""],
["hat_028","hat","","hat_028",10108,"#646c2e",""],
["hat_029","hat","","hat_029",19956,"#8e766f",""],
["hat_030","hat","","hat_030",8648,"#ea9351",""],
["hat_031","hat","","hat_031",63752,"#c073a1",""],
["hat_032","hat","","hat_032",16644,"#5d5e5f","farmer-glass"],
["hat_033","hat","","hat_033",20108,"#658343",""],
["hat_034","hat","","hat_034",9528,"#3a3d3e",""],
["hat_035","hat","","hat_035",12596,"#56738f",""],
["hat_036","hat","","hat_036",6068,"#8197c4",""],
["hat_037","hat","","hat_037",6844,"#54452f",""],
["hat_038","hat","","hat_038",10404,"#91999d",""],
["hat_039","hat","","hat_039",7576,"#e15f57",""],
["hat_040","hat","","hat_040",7352,"#d73334",""],
["hat_041","hat","","hat_041",19340,"#ef9430",""],
["hat_042","hat","","hat_042",25456,"#3f4a8b","farmer-glow"],
["hat_043","hat","","hat_043",11144,"#9e7f64",""],
["hat_044","hat","","hat_044",25532,"#e57b20",""],
["hat_045","hat","","hat_045",17016,"#d3b0b5",""],
["hat_046","hat","","hat_046",9756,"#747078",""],
["hat_047","hat","","hat_047",16724,"#ae7c42",""],
["hat_048","hat","","hat_048",12540,"#7382b8",""],
["hat_single_001","helmet","","hat_single_001",14192,"#da6b34",""],
["hat_single_002","helmet","","hat_single_002",15220,"#c7531f",""],
["hat_single_003","helmet","","hat_single_003",15364,"#6d7179",""],
["hat_single_004","helmet","","hat_single_004",13588,"#d7a291",""],
["hat_single_005","helmet","","hat_single_005",17824,"#59564f",""],
["hat_single_006","helmet","","hat_single_006",15692,"#a2c1d2",""],
["hat_single_007","helmet","","hat_single_007",17700,"#b27e69",""],
["hat_single_008","helmet","","hat_single_008",11496,"#474d51",""],
["hat_single_009","helmet","","hat_single_009",19832,"#819097","farmer-glass+farmer-glow"],
["hat_single_010","helmet","","hat_single_010",10988,"#adb1b4",""],
["hat_single_011","helmet","","hat_single_011",17564,"#375a8c","farmer-glass"],
["hat_single_012","helmet","","hat_single_012",11572,"#455a7b",""],
["hat_single_013","helmet","","hat_single_013",23464,"#3a3b3c","farmer-glass"],
["hat_single_014","helmet","","hat_single_014",33988,"#e06f3c","farmer-glass"],
["hat_single_015","helmet","","hat_single_015",17336,"#697364","farmer-glass"],
["mascot_001","mascot","","mascot_001",25932,"#b1b791",""],
["mascot_002","mascot","","mascot_002",26900,"#987367",""],
["mascot_003","mascot","","mascot_003",18164,"#bc7847",""],
["mascot_004","mascot","","mascot_004",26404,"#74a0c5",""],
["mascot_005","mascot","","mascot_005",21784,"#e87f3c",""],
["mascot_006","mascot","","mascot_006",49704,"#b2632c",""],
["mascot_007","mascot","","mascot_007",27812,"#9ab857",""],
["mascot_008","mascot","","mascot_008",18516,"#e2e6e8",""],
["outfit_001","outfit","","outfit_001",26468,"#7091c3",""],
["outfit_002","outfit","","outfit_002",40096,"#6f95c5",""],
["outfit_003","outfit","","outfit_003",33516,"#68654a",""],
["outfit_004","outfit","","outfit_004",23740,"#afb5b9",""],
["outfit_005","outfit","","outfit_005",23956,"#a27b21",""],
["outfit_006","outfit","","outfit_006",19600,"#a9c3e1",""],
["outfit_007","outfit","","outfit_007",16256,"#d7b0a7",""],
["outfit_008","outfit","","outfit_008",12860,"#576aba",""],
["outfit_009","outfit","","outfit_009",14372,"#3f4143",""],
["outfit_010","outfit","","outfit_010",25080,"#3f97ad",""],
["pants_001","pants","","pants_001",11560,"#272b2d",""],
["pants_002","pants","","pants_002",12212,"#76b3f2",""],
["pants_003","pants","","pants_003",13804,"#cc4044",""],
["pants_004","pants","","pants_004",12844,"#eeeff0",""],
["pants_005","pants","","pants_005",20260,"#3c4042",""],
["pants_006","pants","","pants_006",11488,"#b2b9bd",""],
["pants_007","pants","","pants_007",12284,"#2949ab",""],
["pants_008","pants","pants_003","pants_008",13784,"#545d61",""],
["pants_009","pants","pants_004","pants_009",12864,"#669ae2",""],
["pants_010","pants","","pants_010",18796,"#5a9434",""],
["pants_011","pants","","pants_011",48328,"#838a8f",""],
["pants_012","pants","","pants_012",18448,"#ab7b55",""],
["pants_013","pants","","pants_013",17544,"#818587",""],
["pants_014","pants","","pants_014",18956,"#2e2d2e",""],
["shoe_slippers_001","shoes","","shoe_slippers_001",10736,"#ded2a9",""],
["shoe_slippers_002","shoes","","shoe_slippers_002",11420,"#2e79cf",""],
["shoe_slippers_003","shoes","","shoe_slippers_003",14512,"#9c7750",""],
["shoe_slippers_004","shoes","","shoe_slippers_004",16800,"#5f968e",""],
["shoe_slippers_005","shoes","shoe_slippers_004","shoe_slippers_005",16644,"#6e4b38",""],
["shoe_slippers_006","shoes","","shoe_slippers_006",12392,"#2e302b",""],
["shoe_slippers_007","shoes","","shoe_slippers_007",13084,"#a72a9b",""],
["shoe_sneakers_001","shoes","","shoe_sneakers_001",24688,"#895d4f",""],
["shoe_sneakers_002","shoes","","shoe_sneakers_002",11036,"#53433f",""],
["shoe_sneakers_004","shoes","","shoe_sneakers_004",13552,"#2a2f32",""],
["shoe_sneakers_005","shoes","","shoe_sneakers_005",49504,"#acb1b4",""],
["shoe_sneakers_006","shoes","","shoe_sneakers_006",47064,"#ceaaaa",""],
["shoe_sneakers_007","shoes","","shoe_sneakers_007",24912,"#e56a9d",""],
["shoe_sneakers_008","shoes","shoe_sneakers_007","shoe_sneakers_008",26720,"#c0bebd",""],
["shoe_sneakers_009","shoes","","shoe_sneakers_009",46288,"#c9d1d5",""],
["shoe_sneakers_010","shoes","","shoe_sneakers_010",23632,"#543c34",""],
["shoe_sneakers_011","shoes","","shoe_sneakers_011",55164,"#8d9498",""],
["shoe_sneakers_012","shoes","","shoe_sneakers_012",51588,"#605856",""],
["shoe_sneakers_013","shoes","shoe_sneakers_006","shoe_sneakers_013",46936,"#acabab",""],
["shoe_sneakers_014","shoes","shoe_sneakers_011","shoe_sneakers_014",55160,"#c9744f",""],
["shoe_sneakers_015","shoes","","shoe_sneakers_015",19936,"#63473e",""],
["shorts_001","shorts","","shorts_001",14404,"#28292a",""],
["shorts_002","shorts","","shorts_002",9688,"#efdbce",""],
["shorts_003","shorts","","shorts_003",7904,"#959595",""],
["shorts_004","shorts","shorts_001","shorts_004",14912,"#9ea9af",""],
["shorts_005","shorts","","shorts_005",8844,"#143796",""],
["shorts_006","shorts","","shorts_006",8496,"#cf494d",""],
["socks_001","socks","","socks_001",7008,"#252728",""],
["socks_002","socks","socks_001","socks_002",7100,"#e5e9eb",""],
["socks_003","socks","socks_001","socks_003",7084,"#848f94",""],
["socks_004","socks","socks_001","socks_004",7088,"#5f6163",""],
["socks_005","socks","socks_001","socks_005",7000,"#654a42",""],
["socks_006","socks","","socks_006",12020,"#898a8b",""],
["socks_007","socks","","socks_007",9236,"#262829",""],
["socks_008","socks","","socks_008",8552,"#262a2c",""],
["outwear_001","top","","outwear_001",12928,"#39969c",""],
["outwear_002","top","","outwear_002",11768,"#3e4346",""],
["outwear_003","top","","outwear_003",19296,"#7bbee6",""],
["outwear_004","top","","outwear_004",16504,"#257cb7",""],
["outwear_005","top","","outwear_005",18376,"#e85a24",""],
["outwear_006","top","","outwear_006",19580,"#97646a",""],
["outwear_007","top","","outwear_007",16848,"#a75291",""],
["outwear_008","top","","outwear_008",13920,"#636ea4",""],
["outwear_009","top","","outwear_009",16764,"#ccc7c6",""],
["outwear_010","top","","outwear_010",20240,"#f9bc45",""],
["outwear_011","top","","outwear_011",14092,"#b2c760",""],
["outwear_012","top","","outwear_012",11788,"#e8eaeb",""],
["outwear_013","top","","outwear_013",19288,"#c7474f",""],
["outwear_014","top","","outwear_014",16512,"#5b9738",""],
["outwear_015","top","","outwear_015",18368,"#7b6f75",""],
["outwear_016","top","","outwear_016",19724,"#618789",""],
["outwear_017","top","","outwear_017",16828,"#a14e4f",""],
["outwear_018","top","","outwear_018",14068,"#4d734e",""],
["outwear_019","top","","outwear_019",17364,"#bc9d5f",""],
["outwear_020","top","","outwear_020",20220,"#7cd2f6",""],
["outwear_021","top","","outwear_021",23864,"#fccea0",""],
["outwear_022","top","","outwear_022",28168,"#98acae",""],
["outwear_023","top","","outwear_023",18692,"#25282a",""],
["outwear_024","top","","outwear_024",20152,"#383b42",""],
["outwear_025","top","","outwear_025",23612,"#ed96b2",""],
["outwear_026","top","","outwear_026",21924,"#3f509b",""],
["outwear_027","top","","outwear_027",25836,"#dda0a1",""],
["outwear_028","top","","outwear_028",12180,"#e9e5e3",""],
["outwear_029","top","","outwear_029",20192,"#99aad7",""],
["outwear_030","top","","outwear_030",15780,"#fea61a",""],
["outwear_031","top","","outwear_031",20280,"#6e7679",""],
["outwear_032","top","","outwear_032",21000,"#7e4b3a",""],
["outwear_033","top","","outwear_033",23844,"#bfa141",""],
["outwear_034","top","","outwear_034",12468,"#ea403b",""],
["outwear_035","top","","outwear_035",23172,"#4b745e",""],
["outwear_036","top","","outwear_036",10300,"#dd347b",""],
["outwear_037","top","","outwear_037",25948,"#cb565a",""],
["outwear_038","top","","outwear_038",32544,"#cd3b37",""],
["outwear_039","top","","outwear_039",33576,"#559de2",""],
["outwear_040","top","","outwear_040",31884,"#ee670e",""],
["outwear_041","top","","outwear_041",28884,"#f18ba7",""],
["outwear_042","top","","outwear_042",30392,"#45535a",""],
["outwear_043","top","","outwear_043",24216,"#eb9837",""],
["outwear_044","top","","outwear_044",22072,"#cf4542",""],
["outwear_045","top","","outwear_045",16040,"#6d6f70",""],
["outwear_046","top","","outwear_046",25632,"#f8cda6",""],
["outwear_047","top","","outwear_047",19456,"#676e72",""],
["outwear_048","top","","outwear_048",23580,"#66b688",""],
["outwear_049","top","","outwear_049",24956,"#57595a",""],
["outwear_050","top","","outwear_050",19996,"#f17201",""],
["outwear_051","top","","outwear_051",20144,"#5f6b2e",""],
["outwear_052","top","","outwear_052",18480,"#ee5e6e",""],
["outwear_053","top","","outwear_053",17212,"#b98d32",""],
["outwear_054","top","","outwear_054",17084,"#75314e",""],
["outwear_055","top","","outwear_055",20124,"#c13e9d",""],
["outwear_056","top","","outwear_056",20672,"#3b3e40",""],
["outwear_057","top","","outwear_057",35096,"#656e72",""],
["outwear_058","top","","outwear_058",30260,"#8e7063",""],
["outwear_059","top","","outwear_059",36552,"#9d5e50",""],
["outwear_060","top","","outwear_060",19664,"#90b7e9",""]
];
// </measured>

// Working names and how each fits the farm: f = farm (straw hat, dungarees, boots, ...), p = plain (everyday, fits anywhere),
// u = fun (playful, fine for a cheerful game), o = off (off the farm's look: a TV for a head, a toy box, swimwear, angry faces).
// c = covers the face (see above). Faces and bodies are named from their ids below.
const NAMES={
 // Hair that fits under a hat.
 hairstyle_female_001:'Short brown bob|p',hairstyle_female_002:'Red waves|p',hairstyle_female_003:'Black shoulder-length hair|p',
 hairstyle_female_004:'Straight brown bob|p',hairstyle_female_005:'Undercut with a grey streak|u',hairstyle_male_001:'Brown curls|p',
 hairstyle_male_002:'Ginger fringe|p',hairstyle_male_003:'Brown side parting|p',hairstyle_male_004:'Grey curls|p',hairstyle_male_005:'Short dark hair|p',
 hairstyle_male_006:'Auburn crop|p',
 // Big hair.
 hairstyle_female_single_001:'Blue quiff|u',hairstyle_female_single_002:'Long brown hair|p',hairstyle_female_single_003:'Top bun|p',
 hairstyle_female_single_004:'Grey bob|p',hairstyle_female_single_005:'Wavy brown hair|p',hairstyle_female_single_006:'Red afro|p',
 hairstyle_female_single_007:'Long curls|p',hairstyle_male_single_001:'Black short back and sides|p',hairstyle_male_single_002:'Grey quiff|p',
 hairstyle_male_single_003:'Auburn quiff|p',hairstyle_male_single_004:'Single spike|u',hairstyle_male_single_005:'Twists|p',
 hairstyle_male_single_006:'Brown wavy hair|p',hairstyle_male_single_007:'Powdered wig|u',hairstyle_male_single_008:'Rainbow afro|u',
 // Hats.
 hat_001:'Cowboy hat|f',hat_002:'Orange bucket hat|p',hat_003:'Brown trilby|f',hat_004:'Frog bucket hat|u',hat_005:'Grey beanie|f',
 hat_006:'Black beanie|p',hat_007:'Red beanie|f',hat_008:'Brown beanie|f',hat_009:'Straw hat|f',hat_010:'Yellow sun hat|f',
 hat_011:'Miner\'s helmet|u',hat_012:'Bunny beanie|u',hat_013:'Toadstool hat|u',hat_014:'Traffic cone|o',hat_015:'Santa hat|u',
 hat_016:'Rainbow top hat|u',hat_017:'Snail hat|u',hat_018:'Mushroom cap|u',hat_019:'Duck hat|u',hat_020:'Bunny ears|u',
 hat_021:'Sombrero|u',hat_022:'Graduation cap|u',hat_023:'Chef\'s hat|p',hat_024:'Green floppy-eared hat|u',hat_025:'Toy box|o',
 hat_026:'Rainbow cap|u',hat_027:'Drinks helmet|o',hat_028:'Green feathered cap|f',hat_029:'Antler helmet|u',hat_030:'Orange critter hat|u',
 hat_031:'Octopus hat|u',hat_032:'TV head|o',hat_033:'Army cap|p',hat_034:'Top hat|p',hat_035:'Propeller cap|u',hat_036:'Sailor cap|p',
 hat_037:'Peaked cap|p',hat_038:'Horned helmet|u',hat_039:'Plunger|o',hat_040:'Red beret|p',hat_041:'Crab hat|u',hat_042:'Monster hat|u',
 hat_043:'Umbrella hat|u',hat_044:'Crown|u',hat_045:'Star-spangled top hat|o',hat_046:'Cat-ear beanie|u',hat_047:'Jester hat|u',
 hat_048:'Headphones|p',
 // Hoods, helmets and masks over the whole head.
 hat_single_001:'Chicken hood|f',hat_single_002:'Pumpkin head|u|c',hat_single_003:'Koala hood|u',hat_single_004:'Paper bag|o|c',
 hat_single_005:'Cat hood|u',hat_single_006:'Shark hat|u',hat_single_007:'Fox hood|u',hat_single_008:'Open-face helmet|p',
 hat_single_009:'Light bulb head|o|c',hat_single_010:'VR headset|o|c',hat_single_011:'Motorbike helmet|p|c',hat_single_012:'Snorkel mask|u|c',
 hat_single_013:'Flying helmet with goggles|p',hat_single_014:'Diving helmet|u|c',hat_single_015:'Gas mask|o|c',
 // Glasses.
 bandage_001:'Eye patch|u',glasses_002:'White sunglasses|p',glasses_003:'Round black sunglasses|p',glasses_004:'Red glasses|p',
 glasses_005:'Pink tinted glasses|p',glasses_006:'Blue aviators|p',glasses_007:'Black shades|p',glasses_008:'Monocle|u',
 glasses_009:'Blue round glasses|p',glasses_010:'Green round sunglasses|u',glasses_011:'Pink round sunglasses|u',glasses_012:'Brown sunglasses|p',
 glasses_013:'Ski goggles|u',glasses_014:'Pince-nez|u',glasses_015:'Orange visor glasses|u',glasses_016:'Glowing shades|o',
 glasses_017:'Black square sunglasses|p',glasses_018:'Shutter shades|u',glasses_019:'Bug-eye glasses|u',glasses_020:'Cat-eye glasses|u',
 glasses_021:'3D glasses|u',
 // Face extras.
 beard_001:'Short beard|p',beard_002:'Full beard|p',beard_003:'Long beard|p',clown_nose_001:'Clown nose|u',earrings_001:'Earrings|p',
 headphones_002:'Earphones|p',mask_001:'Face mask|o',mask_002:'Black face mask|o',mustache_001:'Small mustache|p',mustache_002:'Curled mustache|p',
 mustache_003:'Thick mustache|p',mustache_004:'Chin tuft|p',mustache_005:'Pencil mustache|p',mustache_006:'Handlebar mustache|p',
 mustache_007:'Mustache and goatee|p',mustache_008:'Walrus mustache|p',mustache_009:'Brush mustache|p',mustache_010:'Long drooping mustache|u',
 mustache_011:'Wavy mustache|p',mustache_012:'Goatee|p',mustache_013:'Long chin strap|u',mustache_014:'Thin mustache|p',mustache_015:'Twirled mustache|u',
 pacifier_001:'Dummy|o',piercing_001:'Lip ring|u',
 // Tops.
 outwear_001:'Teal T-shirt|p',outwear_002:'Black vest top|p',outwear_003:'Open blue shirt|p',outwear_004:'Blue V-neck|p',outwear_005:'Red polo shirt|p',
 outwear_006:'Black polo shirt|p',outwear_007:'Pink and navy shirt|p',outwear_008:'White raglan T-shirt|p',outwear_009:'White T-shirt with brown sleeves|p',
 outwear_010:'Yellow work shirt|f',outwear_011:'Green striped T-shirt|p',outwear_012:'White vest top|p',outwear_013:'Open red shirt|p',
 outwear_014:'Green V-neck|p',outwear_015:'Blue polo shirt|p',outwear_016:'White polo shirt|p',outwear_017:'Red and black shirt|p',
 outwear_018:'Orange raglan T-shirt|p',outwear_019:'Orange V-neck|p',outwear_020:'Light blue work shirt|f',outwear_021:'Long beige coat|p',
 outwear_022:'Green body warmer|f',outwear_023:'Black jumper|p',outwear_024:'Striped cardigan|p',outwear_025:'Pink zip jacket|p',
 outwear_026:'Navy hoodie|p',outwear_027:'Red varsity jacket|p',outwear_028:'White T-shirt|p',outwear_029:'Blue track top|p',
 outwear_030:'Orange T-shirt|p',outwear_031:'Grey jacket|p',outwear_032:'Brown long coat|f',outwear_033:'Yellow blazer|p',
 outwear_034:'Red swimsuit|o',outwear_035:'Green shirt|f',outwear_036:'Pink bikini top|o',outwear_037:'Red track jacket|p',
 outwear_038:'Red trench coat|p',outwear_039:'Blue puffer jacket|f',outwear_040:'Orange anorak|f',outwear_041:'Pink coat|p',
 outwear_042:'Dark parka|f',outwear_043:'Orange jumper with a stripe|p',outwear_044:'Red jacket|p',outwear_045:'Black and white T-shirt|p',
 outwear_046:'Lilac hoodie|p',outwear_047:'Grey sweatshirt|p',outwear_048:'Lime track jacket|p',outwear_049:'Black zip jacket|p',
 outwear_050:'Orange hoodie|p',outwear_051:'Black and green jacket|p',outwear_052:'Red striped jumper|p',outwear_053:'Yellow cropped jacket|u',
 outwear_054:'Pink and black top|u',outwear_055:'Pink crop top|o',outwear_056:'Black utility vest|u',outwear_057:'Studded leather jacket|u',
 outwear_058:'Green and black shirt|u',outwear_059:'Red striped jumper with pins|u',outwear_060:'Blue raglan top|p',
 // Outfits.
 outfit_001:'Denim dungarees|f',outfit_002:'Blue racing suit|u',outfit_003:'Khaki overall with straps|u',outfit_004:'White blouse and black skirt|p',
 outfit_005:'Yellow crop top and skirt|o',outfit_006:'Blue blouse and skirt|p',outfit_007:'White T-shirt and coral skirt|p',outfit_008:'Purple dress|p',
 outfit_009:'Black dress|p',outfit_010:'Bathrobe|u',
 // Costumes.
 costume_1:'Purple bunny suit|u|c',costume_2:'Penguin suit|u|c',costume_3:'Pigeon suit|u',costume_4:'Pirate|u',costume_5:'Father Christmas|u',
 costume_6:'Superhero|u|c',costume_7:'Bee suit|f',costume_8:'Astronaut|u|c',costume_9:'Neon suit|o|c',costume_10:'Hazmat suit|o|c',
 costume_11:'Knight\'s armour|u|c',costume_12:'Soldier|o|c',costume_13:'Jester|u',costume_14:'Dinosaur onesie|u',
 // Mascots.
 mascot_001:'Crocodile mascot|u',mascot_002:'Mouse mascot|u',mascot_003:'Pencil mascot|o',mascot_004:'Hammerhead mascot|u',
 mascot_005:'Hot dog mascot|u',mascot_006:'Cactus mascot|u',mascot_007:'Snail mascot|u',mascot_008:'Ghost mascot|u',
 // Trousers and shorts.
 pants_001:'Black trousers|p',pants_002:'Light jeans|f',pants_003:'Red joggers|p',pants_004:'White trousers|p',pants_005:'Black cargo trousers|p',
 pants_006:'Grey trousers|p',pants_007:'Blue trousers|p',pants_008:'Grey joggers|p',pants_009:'Rolled-up jeans|f',pants_010:'Green cargo trousers|f',
 pants_011:'Studded black trousers|u',pants_012:'Patchwork trousers|u',pants_013:'Striped trousers|u',pants_014:'Black camouflage trousers|p',
 shorts_001:'Black shorts|p',shorts_002:'White and red shorts|p',shorts_003:'Grey shorts|p',shorts_004:'White shorts|p',shorts_005:'Blue shorts|p',
 shorts_006:'Red shorts|p',
 // Shoes.
 shoe_slippers_001:'Yellow flip-flops|p',shoe_slippers_002:'Duck slippers|u',shoe_slippers_003:'Frog slippers|u',shoe_slippers_004:'Teal slip-ons|p',
 shoe_slippers_005:'Orange slip-ons|p',shoe_slippers_006:'Black sandals|p',shoe_slippers_007:'Pink sliders|p',shoe_sneakers_001:'Tan shoes|p',
 shoe_sneakers_002:'Brown shoes|p',shoe_sneakers_004:'Black shoes|p',shoe_sneakers_005:'Grey trainers|p',shoe_sneakers_006:'Red trainers|p',
 shoe_sneakers_007:'Pink trainers|p',shoe_sneakers_008:'White trainers|p',shoe_sneakers_009:'Chunky white trainers|p',shoe_sneakers_010:'Brown boots|f',
 shoe_sneakers_011:'Black boots|f',shoe_sneakers_012:'Brown lace-up boots|f',shoe_sneakers_013:'Black trainers|p',shoe_sneakers_014:'Tan boots|f',
 shoe_sneakers_015:'Brown lace-ups|p',
 // Socks.
 socks_001:'Black socks|p',socks_002:'White socks|p',socks_003:'Grey socks|p',socks_004:'Dark grey socks|p',socks_005:'Brown socks|p',
 socks_006:'Striped knee socks|u',socks_007:'Black knee socks|p',socks_008:'Black long socks|p',
 // Gloves.
 gloves_001:'Cyan gloves|p',gloves_002:'Red gloves|p',gloves_003:'Purple gloves|p',gloves_004:'Yellow fingerless gloves|p',gloves_005:'Black fingerless gloves|p',
 gloves_006:'Green fingerless gloves|p',gloves_007:'White fingerless gloves|p',gloves_008:'Black gloves|p',gloves_009:'Orange gloves|p',
 gloves_010:'Grey gloves|p',gloves_011:'Blue cuffed gloves|p',gloves_012:'Green cuffed gloves|p',gloves_013:'White cuffed gloves|p',
 gloves_014:'Red cuffed gloves|p',gloves_015:'Red boxing gloves|u',gloves_016:'Blue boxing gloves|u',gloves_017:'Brown boxing gloves|u',
 gloves_018:'Yellow rubber gloves|f',gloves_019:'Striped arm warmers|u',gloves_020:'Long black gloves|u',gloves_021:'Olive work gloves|f',
 gloves_022:'Black work gloves|f',gloves_023:'Thin gloves|p'
};
// The bodies: five skin tones and eleven bright colours of the same farmer.
const BODY_NAMES={body_001:'White',body_002:'Grey',body_003:'Charcoal',body_004:'Red',body_005:'Orange',body_006:'Yellow',body_007:'Green',
 body_008:'Sky blue',body_009:'Skin tone 1',body_010:'Skin tone 2',body_011:'Skin tone 3',body_012:'Skin tone 4',body_013:'Skin tone 5',
 body_014:'Pink',body_015:'Purple',body_016:'Blue'};
// The faces: a mood in one of four styles (the pack's rows A to D), with or without lashes and lips. Friendly moods are plain, the
// cross ones off the farm's cheerful look.
const MOODS={usual:'p',happy:'p',neutral:'p',surprised:'u',confuse:'u',compassion:'u',impatience:'u',sad:'u',anger:'o',angry:'o',evil:'o',madness:'o'};
function faceName(id){
 const [,set,mood,n]=/^(male|female)_emotion_([a-z]+)_(\d+)$/.exec(id);
 const word={usual:'Smiling',happy:'Happy',neutral:'Calm',surprised:'Surprised',confuse:'Puzzled',compassion:'Kind',impatience:'Impatient',sad:'Sad',anger:'Shouting',angry:'Cross',evil:'Sly',madness:'Wild'}[mood];
 return [`${word} face ${'ABCD'[Number(n)-1]}${set==='female'?' with lashes':''}`,MOODS[mood]];
}
const FIT={f:'farm',p:'plain',u:'fun',o:'off'};
// The catalog: every part by id. files: the part's files in /assets/farmer/parts/ (a costume has several). earned: see FARMER_GROUPS.
// Each earned part's goal: [counter of FARMER_GOALS, how many] (FARMER_REWARDS, below; here first, as FARMER_PARTS marks them earned).
const REWARD_TABLE=Object.freeze({
 // Faces: the first hour.
 male_emotion_usual_001:['harvested',25],male_emotion_usual_003:['tended',5],male_emotion_happy_001:['sold',25],male_emotion_happy_003:['visits',3],
 female_emotion_usual_002:['watered',10],female_emotion_happy_001:['eggs',10],female_emotion_happy_002:['level',5],
 // Hair.
 hairstyle_male_001:['harvested',50],hairstyle_male_002:['deliveries',1],hairstyle_male_004:['visits',20],hairstyle_male_005:['fish',5],
 hairstyle_female_002:['dailies',3],hairstyle_female_003:['produced',10],hairstyle_female_004:['upgrades',5],
 hairstyle_female_single_003:['rounds',3],hairstyle_female_single_007:['level',15],
 // Glasses.
 glasses_002:['fish',100],glasses_003:['streak',3],glasses_007:['tractor',250],glasses_009:['milk',10],glasses_012:['watered',100],
 // Beards and mustaches.
 beard_001:['chores',5],beard_003:['level',75],mustache_001:['harvested',100],mustache_003:['produced',50],mustache_006:['cheese',10],
 mustache_008:['chores',100],mustache_012:['tended',25],
 // Tops.
 outwear_005:['bread',5],outwear_020:['harvested',250],outwear_035:['dailies',10],outwear_022:['wool',50],outwear_039:['streak',7],
 outwear_040:['fish',50],outwear_042:['wool',250],outwear_032:['level',50],
 // Trousers and shorts.
 pants_009:['harvested',500],pants_010:['tended',100],pants_005:['upgrades',50],pants_001:['sold',500],pants_007:['produced',250],
 shorts_005:['pets',50],shorts_001:['honey',25],
 // Outfits.
 outfit_004:['sold',1000],outfit_006:['deliveries',15],outfit_007:['cheese',50],outfit_008:['level',30],outfit_009:['deliveries',30],
 // Shoes.
 shoe_sneakers_001:['watered',500],shoe_sneakers_002:['rounds',50],shoe_sneakers_008:['dailies',25],shoe_sneakers_011:['harvested',1000],
 shoe_sneakers_012:['produced',1000],shoe_sneakers_014:['watered',2000],shoe_sneakers_015:['chores',250],
 // Gloves.
 gloves_018:['milk',500],gloves_022:['harvested',2500],gloves_008:['tended',500],gloves_009:['eggs',1000],gloves_010:['bread',100],
 // Hats (the goals of 21 Oct 2026 kept).
 hat_009:['harvested',10],hat_002:['watered',25],hat_008:['eggs',50],hat_005:['sold',100],hat_028:['pets',10],hat_010:['deliveries',5],
 hat_036:['fish',25],hat_023:['bread',25],hat_001:['milk',100],hat_003:['rounds',15],hat_007:['chores',25],hat_037:['visits',7],
 hat_single_001:['eggs',250],hat_040:['upgrades',20],hat_single_013:['tractor',25],hat_016:['streak',14],hat_034:['sold',2000],
 // Costumes: the long run.
 costume_7:['honey',100],costume_11:['harvested',5000]
});
export const FARMER_PARTS=Object.freeze(Object.fromEntries(MEASURED.map(([id,group,style,files,bytes,colour,materials])=>{
 const [name,fit,flags='']=group==='face'?faceName(id):group==='body'?[BODY_NAMES[id],Number(id.slice(-3))>=9&&Number(id.slice(-3))<=13?'p':'u']:(NAMES[id]??`${id}|p`).split('|');
 return [id,Object.freeze({id,group,slot:FARMER_GROUPS[group].slot,name,fit:FIT[fit],earned:FARMER_GROUPS[group].earned||Object.hasOwn(REWARD_TABLE,id),coversFace:flags.includes('c'),
  files:Object.freeze(files.split('+')),bytes,colour,style:style||id,glass:materials.includes('farmer-glass'),glow:materials.includes('farmer-glow')})];
})));
export const farmerPart=id=>typeof id==='string'&&Object.hasOwn(FARMER_PARTS,id)?FARMER_PARTS[id]:null;
export const partsOfSlot=slot=>Object.values(FARMER_PARTS).filter(p=>p.slot===slot);

// Everyone's farmer until they make their own: skin tone 2, a smile, brown hair, the denim dungarees and brown boots (all free).
export const DEFAULT_FARMER=Object.freeze({body:'body_010',face:'male_emotion_usual_002',hair:'hairstyle_male_003',outfit:'outfit_001',shoes:'shoe_sneakers_010'});

// Whether two groups clash (either way round), and whether two parts do (with coversFace).
const blocks=new Map();
for(const [group,list] of FARMER_RULES)for(const other of list){(blocks.get(group)??blocks.set(group,new Set()).get(group)).add(other);(blocks.get(other)??blocks.set(other,new Set()).get(other)).add(group);}
export const groupsClash=(a,b)=>blocks.get(a)?.has(b)??false;
export function partsClash(a,b){
 if(!a||!b||a.id===b.id)return false;
 if(groupsClash(a.group,b.group))return true;
 const face=p=>p.group==='glasses'||p.group==='faceExtra';
 return (a.coversFace&&face(b))||(b.coversFace&&face(a));
}
// Checks a farmer as it would be saved: a plain object with only known slots, each a known part of that slot, body and face there,
// nothing that clashes, and (with `owned`: the ids a farmer has earned) no earned part they do not have; with offered, only parts My
// farmer offers (farmerOffered: no part off the farm's look, no earned part that is no reward yet). Returns {ok:true} or {ok:false,error}
// with a short English reason (for logs, never shown as it is).
export function validFarmerConfig(config,{owned=null,offered=false}={}){
 if(!config||typeof config!=='object'||Array.isArray(config))return {ok:false,error:'not an object'};
 const keys=Object.keys(config);
 if(keys.length>FARMER_SLOTS.length)return {ok:false,error:'too many slots'};
 const worn=[];
 for(const slot of keys){
  if(!FARMER_SLOTS.includes(slot))return {ok:false,error:`unknown slot ${String(slot).slice(0,20)}`};
  const id=config[slot];if(id==null)continue;
  const part=farmerPart(id);
  if(!part)return {ok:false,error:`unknown part ${String(id).slice(0,40)}`};
  if(part.slot!==slot)return {ok:false,error:`${id} does not go in ${slot}`};
  if(offered&&!farmerOffered(part))return {ok:false,error:`${id} is not offered`};
  if(part.earned&&owned&&!(owned instanceof Set?owned.has(id):Array.isArray(owned)&&owned.includes(id)))return {ok:false,error:`${id} is not earned yet`};
  worn.push(part);
 }
 for(const slot of REQUIRED_SLOTS)if(!farmerPart(config[slot]))return {ok:false,error:`no ${slot}`};
 for(let i=0;i<worn.length;i++)for(let j=i+1;j<worn.length;j++)if(partsClash(worn[i],worn[j]))return {ok:false,error:`${worn[i].id} and ${worn[j].id} do not go together`};
 return {ok:true};
}
// Puts a part on (or, with id null, takes a slot's part off): what clashes with it comes off. Body and face are never taken off.
export function wearPart(config,slot,id){
 const next={...config};
 if(id==null){if(!REQUIRED_SLOTS.includes(slot))delete next[slot];return next;}
 const part=farmerPart(id);if(!part||part.slot!==slot)return next;
 next[slot]=id;
 for(const other of FARMER_SLOTS)if(other!==slot&&partsClash(part,farmerPart(next[other])))delete next[other];
 return next;
}
// The slots a part would take off if it were put on now (the creator says so on the part's picture).
export const partTakesOff=(config,id)=>{const part=farmerPart(id);return part?FARMER_SLOTS.filter(slot=>slot!==part.slot&&partsClash(part,farmerPart(config?.[slot]))):[];};
// The files a farmer wears, body first (farmer.js loads only these).
export const farmerFiles=config=>FARMER_SLOTS.flatMap(slot=>farmerPart(config?.[slot])?.files??[]);

// What My farmer offers for free (21 Oct 2026, the owner: "maak bijna alle mijn boer items lockable, behalve huidskleuren en de basic
// items"): the five skin tones and the basics, about the default farmer and one or two plain others a tab. Everything else My farmer
// shows is earned (FARMER_REWARDS, below). The rest of the pack stays in the catalog (and its files), but is not shown or saved
// (farmerOffered). Socks and mascots are not offered (a tab with nothing is left out).
export const FARMER_FREE=Object.freeze(new Set([
 'body_009','body_010','body_011','body_012','body_013',                                 // the five skin tones
 'male_emotion_usual_002','female_emotion_usual_001',                                     // two smiling faces
 'hairstyle_male_003','hairstyle_female_001','hairstyle_female_single_002',               // brown side parting, short bob, long brown hair
 'glasses_004','beard_002',                                                               // red glasses, a full beard
 'outwear_001','outwear_010','pants_002','outfit_001',                                    // a T-shirt, the work shirt, jeans, the dungarees
 'shoe_sneakers_010','gloves_021'                                                         // brown boots, work gloves
]));
// Every other part My farmer offers is earned (hats and costumes always are), each with a goal of its own on the farm's own counters
// (FARMER_GOALS): ladders from the first hour to the long run, so there is always a next one close by. No two share a goal. The numbers
// were checked against the live farms on 21 Oct 2026 (percentiles per level band, see the commits).
export const FARMER_REWARDS=Object.freeze(Object.fromEntries(Object.entries(REWARD_TABLE).map(([id,[goal,target]])=>[id,Object.freeze({goal,target})])));
export const FARMER_OFFER=Object.freeze(new Set([...FARMER_FREE,...Object.keys(REWARD_TABLE)]));
// The farm's counters a goal reads (farm: {level}, the farm's level, from farm-state.js levelOf, the same on the page and the server).
const whole=v=>Math.max(0,Math.floor(Number(v)||0));
export const FARMER_GOALS=Object.freeze({
 harvested:s=>s.stats?.harvested,watered:s=>s.stats?.watered,tended:s=>s.stats?.tended,sold:s=>s.stats?.sold,produced:s=>s.stats?.produced,
 eggs:s=>s.stats?.made_eggs,milk:s=>s.stats?.made_milk,cheese:s=>s.stats?.made_cheese,bread:s=>s.stats?.made_bread,honey:s=>s.stats?.made_honey,
 wool:s=>s.stats?.made_wool,pets:s=>s.stats?.pets_patted,fish:s=>s.stats?.fish,deliveries:s=>s.stats?.deliveries,dailies:s=>s.stats?.dailies,
 rounds:s=>s.stats?.activity_rounds,chores:s=>s.stats?.chores,upgrades:s=>s.stats?.upgrades,tractor:s=>s.stats?.tractor,
 visits:s=>s.login?.visits,streak:s=>s.login?.best,level:(s,farm)=>farm.level
});
// How far a farm is with a part's goal: {goal, count, target} (count never over target); null for a part that is no reward.
export function rewardProgress(id,state,farm={}){
 const r=Object.hasOwn(FARMER_REWARDS,id)?FARMER_REWARDS[id]:null;if(!r)return null;
 const count=whole(FARMER_GOALS[r.goal](state&&typeof state==='object'?state:{},farm&&typeof farm==='object'?farm:{}));
 return {goal:r.goal,count:Math.min(count,r.target),target:r.target};
}
export const rewardOpen=(id,state,farm={})=>{const p=rewardProgress(id,state,farm);return Boolean(p)&&p.count>=p.target;};
// The earned parts a farm has: validFarmerConfig's owned, the same on the farm's page and on the server (farm: {level}).
export const farmerOwned=(state,farm={})=>Object.keys(FARMER_REWARDS).filter(id=>rewardOpen(id,state,farm));
// The parts My farmer offers: the free ones and the rewards.
export const farmerOffered=p=>Boolean(p)&&FARMER_OFFER.has(p.id);
export const creatorParts=slot=>partsOfSlot(slot).filter(farmerOffered);
// A saved farmer as stored: only its worn slots, as plain ids.
export const cleanFarmer=config=>Object.fromEntries(FARMER_SLOTS.filter(slot=>typeof config?.[slot]==='string').map(slot=>[slot,config[slot]]));
// The farmer a farm shows: its own (state.farmer, written by the farm action farmer_wear) or, for a farm that never made one, the
// default farmer. A part it no longer has (a refunded season) or no longer offered comes off; anything broken is the default farmer.
export function farmerOf(state,farm={}){
 const saved=state?.farmer;
 if(!saved||typeof saved!=='object'||Array.isArray(saved)||!validFarmerConfig(saved).ok)return {...DEFAULT_FARMER};
 const owned=new Set(farmerOwned(state,farm));let config=cleanFarmer(saved);
 for(const slot of FARMER_SLOTS){const p=farmerPart(config[slot]);if(p&&(!farmerOffered(p)||p.earned&&!owned.has(p.id)))config=wearPart(config,slot,null);}
 return validFarmerConfig(config).ok?config:{...DEFAULT_FARMER};
}
