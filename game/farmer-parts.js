// The parts a farmer can wear, and which go together (20 Oct 2026, the owner: "Doe 2"): ithappy Studios' Creative Characters pack,
// cut into one file a part by scripts/build-farmer.mjs (which also fills the block between the markers below with what it measured).
// Pure rules, no imports: the site uses its copy (public/farmer-parts.js, scripts/sync-game.mjs) and farm-api can take the same file
// later to check a farmer before it is saved. The names are working names: no screen shows them yet (the creator shows pictures).
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
["body_001","body","","body_001",34220,"#d5dbde",""],
["body_002","body","body_001","body_002",33668,"#697074",""],
["body_003","body","body_001","body_003",33520,"#2a2b2c",""],
["body_004","body","body_001","body_004",33972,"#e23637",""],
["body_005","body","body_001","body_005",33668,"#e9581e",""],
["body_006","body","body_001","body_006",33628,"#ffbc0c",""],
["body_007","body","body_001","body_007",34304,"#88b83f",""],
["body_008","body","body_001","body_008",33708,"#03acdf",""],
["body_009","body","body_001","body_009",34336,"#fba860",""],
["body_010","body","body_001","body_010",34688,"#f6945c",""],
["body_011","body","body_001","body_011",34172,"#df7153",""],
["body_012","body","body_001","body_012",33916,"#9a553f",""],
["body_013","body","body_001","body_013",33896,"#50332c",""],
["body_014","body","body_001","body_014",33496,"#e43c79",""],
["body_015","body","body_001","body_015",33440,"#6c209d",""],
["body_016","body","body_001","body_016",33812,"#3545a9",""],
["costume_1","costume","","costume_1_001+costume_1_002",44164,"#7647b7",""],
["costume_2","costume","","costume_2_001+costume_2_002",45392,"#7a5f38",""],
["costume_3","costume","","costume_3_001+costume_3_002",56192,"#9e897c",""],
["costume_4","costume","","costume_4_001+costume_4_002",47580,"#b76437",""],
["costume_5","costume","","costume_5_001+costume_5_002",47892,"#9e5b5c",""],
["costume_6","costume","","costume_6_001",42096,"#915d35","farmer-glow"],
["costume_7","costume","","costume_7_001+costume_7_002+costume_7_003",44940,"#c95917",""],
["costume_8","costume","","costume_8_001+costume_8_002+costume_8_003+costume_8_004",71260,"#888a8c","farmer-glow"],
["costume_9","costume","","costume_9_001+costume_9_002+costume_9_003",61540,"#242627","farmer-glow"],
["costume_10","costume","","costume_10_001",41284,"#926933",""],
["costume_11","costume","","costume_11_001+costume_11_002+costume_11_003",64700,"#696e71",""],
["costume_12","costume","","costume_12_001+costume_12_002",131708,"#7b8b54",""],
["costume_13","costume","","costume_13_001+costume_13_002",42136,"#ac7a32",""],
["costume_14","costume","","costume_14_001+costume_14_002+costume_14_003",57052,"#639146",""],
["female_emotion_anger_001","face","","female_emotion_anger_001",7180,"#84464d",""],
["female_emotion_anger_002","face","","female_emotion_anger_002",8160,"#632d30",""],
["female_emotion_anger_003","face","","female_emotion_anger_003",10868,"#5f5152",""],
["female_emotion_anger_004","face","","female_emotion_anger_004",10036,"#957979",""],
["female_emotion_angry_001","face","","female_emotion_angry_001",8156,"#61292c",""],
["female_emotion_angry_002","face","","female_emotion_angry_002",7844,"#703f45",""],
["female_emotion_angry_003","face","","female_emotion_angry_003",7384,"#424243",""],
["female_emotion_angry_004","face","","female_emotion_angry_004",9564,"#907a7a",""],
["female_emotion_compassion_003","face","","female_emotion_compassion_003",10036,"#6f4949",""],
["female_emotion_compassion_004","face","","female_emotion_compassion_004",10208,"#8f7e7d",""],
["female_emotion_confuse_001","face","","female_emotion_confuse_001",7340,"#643c40",""],
["female_emotion_confuse_002","face","","female_emotion_confuse_002",7612,"#56292b",""],
["female_emotion_confuse_003","face","","female_emotion_confuse_003",9460,"#8f7a7a",""],
["female_emotion_evil_001","face","","female_emotion_evil_001",8104,"#60292c",""],
["female_emotion_evil_002","face","","female_emotion_evil_002",7820,"#703f45",""],
["female_emotion_evil_003","face","","female_emotion_evil_003",8552,"#4d4748",""],
["female_emotion_evil_004","face","","female_emotion_evil_004",10748,"#9d7979",""],
["female_emotion_happy_001","face","","female_emotion_happy_001",7792,"#65282b",""],
["female_emotion_happy_002","face","","female_emotion_happy_002",7940,"#6a3c41",""],
["female_emotion_happy_003","face","","female_emotion_happy_003",8536,"#4d4748",""],
["female_emotion_happy_004","face","","female_emotion_happy_004",10672,"#9d7979",""],
["female_emotion_impatience_001","face","","female_emotion_impatience_001",7984,"#6a3c41",""],
["female_emotion_impatience_002","face","","female_emotion_impatience_002",7872,"#66282b",""],
["female_emotion_madness_003","face","","female_emotion_madness_003",8004,"#5c3f40",""],
["female_emotion_neutral_001","face","","female_emotion_neutral_001",8124,"#61292c",""],
["female_emotion_neutral_002","face","","female_emotion_neutral_002",7800,"#703f45",""],
["female_emotion_neutral_003","face","","female_emotion_neutral_003",7312,"#424344",""],
["female_emotion_neutral_004","face","","female_emotion_neutral_004",9436,"#8f7a7a",""],
["female_emotion_sad_001","face","","female_emotion_sad_001",8068,"#61292c",""],
["female_emotion_sad_002","face","","female_emotion_sad_002",7820,"#703f45",""],
["female_emotion_sad_003","face","","female_emotion_sad_003",7264,"#424344",""],
["female_emotion_sad_004","face","","female_emotion_sad_004",9416,"#8f7a7a",""],
["female_emotion_surprised_001","face","","female_emotion_surprised_001",7832,"#744247",""],
["female_emotion_surprised_002","face","","female_emotion_surprised_002",8092,"#632d30",""],
["female_emotion_surprised_003","face","","female_emotion_surprised_003",10700,"#5c5253",""],
["female_emotion_surprised_004","face","","female_emotion_surprised_004",10880,"#957c7c",""],
["female_emotion_usual_001","face","","female_emotion_usual_001",8048,"#60292c",""],
["female_emotion_usual_002","face","","female_emotion_usual_002",7800,"#703f45",""],
["female_emotion_usual_003","face","","female_emotion_usual_003",7292,"#424243",""],
["female_emotion_usual_004","face","","female_emotion_usual_004",9440,"#8f7a7a",""],
["male_emotion_anger_001","face","","male_emotion_anger_001",6560,"#3b3030",""],
["male_emotion_anger_002","face","","male_emotion_anger_002",6964,"#352d2e",""],
["male_emotion_anger_003","face","","male_emotion_anger_003",10268,"#675354",""],
["male_emotion_anger_004","face","","male_emotion_anger_004",7456,"#b3887d",""],
["male_emotion_angry_001","face","","male_emotion_angry_001",6648,"#262627",""],
["male_emotion_angry_002","face","","male_emotion_angry_002",6132,"#2f2c2c",""],
["male_emotion_angry_003","face","","male_emotion_angry_003",6596,"#4c4d4d",""],
["male_emotion_angry_004","face","","male_emotion_angry_004",6840,"#ab8b81",""],
["male_emotion_compassion_003","face","","male_emotion_compassion_003",9724,"#705850",""],
["male_emotion_compassion_004","face","","male_emotion_compassion_004",8712,"#ad9a95",""],
["male_emotion_confuse_001","face","","male_emotion_confuse_001",6176,"#2f2c2c",""],
["male_emotion_confuse_002","face","","male_emotion_confuse_002",6600,"#262627",""],
["male_emotion_confuse_004","face","","male_emotion_confuse_004",6800,"#ab8b81",""],
["male_emotion_evil_001","face","","male_emotion_evil_001",6672,"#262627",""],
["male_emotion_evil_002","face","","male_emotion_evil_002",6128,"#2f2c2c",""],
["male_emotion_evil_003","face","","male_emotion_evil_003",7872,"#544e4f",""],
["male_emotion_evil_004","face","","male_emotion_evil_004",8092,"#b38578",""],
["male_emotion_happy_001","face","","male_emotion_happy_001",6756,"#2a2828",""],
["male_emotion_happy_002","face","","male_emotion_happy_002",6808,"#252526",""],
["male_emotion_happy_003","face","","male_emotion_happy_003",7856,"#564e4f",""],
["male_emotion_happy_004","face","","male_emotion_happy_004",8104,"#b38578",""],
["male_emotion_impatience_001","face","","male_emotion_impatience_001",6784,"#2a2828",""],
["male_emotion_impatience_002","face","","male_emotion_impatience_002",6828,"#252526",""],
["male_emotion_madness_003","face","","male_emotion_madness_003",7348,"#654344",""],
["male_emotion_neutral_001","face","","male_emotion_neutral_001",6432,"#262727",""],
["male_emotion_neutral_002","face","","male_emotion_neutral_002",6104,"#2f2c2c",""],
["male_emotion_neutral_003","face","","male_emotion_neutral_003",6228,"#4d4f50",""],
["male_emotion_neutral_004","face","","male_emotion_neutral_004",6336,"#a5908a",""],
["male_emotion_sad_001","face","","male_emotion_sad_001",6132,"#2f2c2c",""],
["male_emotion_sad_002","face","","male_emotion_sad_002",6644,"#262627",""],
["male_emotion_sad_003","face","","male_emotion_sad_003",6892,"#494a4b",""],
["male_emotion_sad_004","face","","male_emotion_sad_004",6816,"#ab8b81",""],
["male_emotion_surprised_001","face","","male_emotion_surprised_001",6920,"#332e2e",""],
["male_emotion_surprised_002","face","","male_emotion_surprised_002",6704,"#3b3131",""],
["male_emotion_surprised_003","face","","male_emotion_surprised_003",10036,"#645555",""],
["male_emotion_surprised_004","face","","male_emotion_surprised_004",9388,"#b29790",""],
["male_emotion_usual_001","face","","male_emotion_usual_001",6132,"#2f2c2c",""],
["male_emotion_usual_002","face","","male_emotion_usual_002",6660,"#262627",""],
["male_emotion_usual_003","face","","male_emotion_usual_003",6596,"#4b4c4d",""],
["male_emotion_usual_004","face","","male_emotion_usual_004",6844,"#ab8b81",""],
["beard_001","faceExtra","","beard_001",5108,"#5a4a45",""],
["beard_002","faceExtra","","beard_002",5492,"#5c4b46",""],
["beard_003","faceExtra","","beard_003",5620,"#54433f",""],
["clown_nose_001","faceExtra","","clown_nose_001",4648,"#d53030",""],
["earrings_001","faceExtra","","earrings_001",4680,"#fb7f0a",""],
["headphones_002","faceExtra","","headphones_002",5096,"#f4f5f6",""],
["mask_001","faceExtra","","mask_001",5972,"#96d9fa",""],
["mask_002","faceExtra","","mask_002",4844,"#262627",""],
["mustache_001","faceExtra","","mustache_001",3980,"#4a3c39",""],
["mustache_002","faceExtra","","mustache_002",4480,"#554641",""],
["mustache_003","faceExtra","","mustache_003",5352,"#584844",""],
["mustache_004","faceExtra","","mustache_004",5360,"#584944",""],
["mustache_005","faceExtra","","mustache_005",4368,"#574944",""],
["mustache_006","faceExtra","","mustache_006",5428,"#584945",""],
["mustache_007","faceExtra","","mustache_007",6232,"#574944",""],
["mustache_008","faceExtra","","mustache_008",5492,"#574944",""],
["mustache_009","faceExtra","","mustache_009",5520,"#574944",""],
["mustache_010","faceExtra","","mustache_010",7692,"#574944",""],
["mustache_011","faceExtra","","mustache_011",5876,"#574944",""],
["mustache_012","faceExtra","","mustache_012",4348,"#574944",""],
["mustache_013","faceExtra","","mustache_013",5236,"#584944",""],
["mustache_014","faceExtra","","mustache_014",5200,"#574944",""],
["mustache_015","faceExtra","","mustache_015",4932,"#574944",""],
["pacifier_001","faceExtra","","pacifier_001",6464,"#ed6c92",""],
["piercing_001","faceExtra","","piercing_001",4040,"#c7c8c8",""],
["bandage_001","glasses","","bandage_001",6148,"#252525",""],
["glasses_002","glasses","","glasses_002",15456,"#d8d9d9",""],
["glasses_003","glasses","","glasses_003",7572,"#262627","farmer-glass"],
["glasses_004","glasses","","glasses_004",13508,"#dc3531",""],
["glasses_005","glasses","","glasses_005",11556,"#574946","farmer-glass"],
["glasses_006","glasses","","glasses_006",13228,"#fc951e","farmer-glass"],
["glasses_007","glasses","","glasses_007",9060,"#49555a",""],
["glasses_008","glasses","","glasses_008",5172,"#f87611",""],
["glasses_009","glasses","","glasses_009",7108,"#05aac6",""],
["glasses_010","glasses","","glasses_010",13436,"#28292a","farmer-glass"],
["glasses_011","glasses","","glasses_011",12232,"#f2f2f3","farmer-glass"],
["glasses_012","glasses","","glasses_012",14308,"#ca7141",""],
["glasses_013","glasses","","glasses_013",9912,"#343f46","farmer-glass"],
["glasses_014","glasses","","glasses_014",5688,"#3cb8f1",""],
["glasses_015","glasses","","glasses_015",9744,"#eceded","farmer-glass"],
["glasses_016","glasses","","glasses_016",9512,"#282d2f","farmer-glow"],
["glasses_017","glasses","","glasses_017",11568,"#282c2f","farmer-glow"],
["glasses_018","glasses","","glasses_018",7824,"#cb2a2b",""],
["glasses_019","glasses","","glasses_019",10560,"#79ad3f","farmer-glass"],
["glasses_020","glasses","","glasses_020",10712,"#e85084","farmer-glass"],
["glasses_021","glasses","","glasses_021",8732,"#d7dde0","farmer-glass"],
["gloves_001","gloves","","gloves_001",15128,"#02a7da",""],
["gloves_002","gloves","gloves_001","gloves_002",15068,"#d22e30",""],
["gloves_003","gloves","gloves_001","gloves_003",15144,"#bc68c3",""],
["gloves_004","gloves","","gloves_004",12316,"#ddad1b",""],
["gloves_005","gloves","gloves_004","gloves_005",12268,"#2b2b2c",""],
["gloves_006","gloves","gloves_004","gloves_006",12340,"#677f2d",""],
["gloves_007","gloves","gloves_004","gloves_007",12292,"#b9b7b7",""],
["gloves_008","gloves","","gloves_008",13792,"#25292c",""],
["gloves_009","gloves","","gloves_009",14240,"#ea581b",""],
["gloves_010","gloves","gloves_009","gloves_010",14308,"#5d6162",""],
["gloves_011","gloves","","gloves_011",15800,"#244473",""],
["gloves_012","gloves","gloves_011","gloves_012",15632,"#96a127",""],
["gloves_013","gloves","gloves_011","gloves_013",15720,"#689fcb",""],
["gloves_014","gloves","gloves_011","gloves_014",15716,"#802a2b",""],
["gloves_015","gloves","","gloves_015",14268,"#af414d",""],
["gloves_016","gloves","gloves_015","gloves_016",14268,"#2b508b",""],
["gloves_017","gloves","gloves_015","gloves_017",14268,"#484140",""],
["gloves_018","gloves","gloves_001","gloves_018",15072,"#ffc512",""],
["gloves_019","gloves","","gloves_019",17052,"#6a2122",""],
["gloves_020","gloves","","gloves_020",15112,"#242626",""],
["gloves_021","gloves","","gloves_021",15132,"#7c7d3c",""],
["gloves_022","gloves","gloves_021","gloves_022",15128,"#2a2a2c",""],
["gloves_023","gloves","gloves_021","gloves_023",15132,"#fa9a5f",""],
["hairstyle_female_001","hair","","hairstyle_female_001",13500,"#784a3b",""],
["hairstyle_female_002","hair","","hairstyle_female_002",10136,"#f17206",""],
["hairstyle_female_003","hair","","hairstyle_female_003",9004,"#36393b",""],
["hairstyle_female_004","hair","","hairstyle_female_004",6672,"#553a32",""],
["hairstyle_female_005","hair","","hairstyle_female_005",21116,"#727374",""],
["hairstyle_male_001","hair","","hairstyle_male_001",13620,"#664338",""],
["hairstyle_male_002","hair","","hairstyle_male_002",5372,"#fa8d05",""],
["hairstyle_male_003","hair","","hairstyle_male_003",7672,"#744f46",""],
["hairstyle_male_004","hair","","hairstyle_male_004",9984,"#cacbcb",""],
["hairstyle_male_005","hair","","hairstyle_male_005",9040,"#4e4644",""],
["hairstyle_male_006","hair","","hairstyle_male_006",14188,"#b25c4a",""],
["hairstyle_female_single_001","hairFull","","hairstyle_female_single_001",10888,"#1191e4",""],
["hairstyle_female_single_002","hairFull","","hairstyle_female_single_002",9304,"#5f433b",""],
["hairstyle_female_single_003","hairFull","","hairstyle_female_single_003",7860,"#675752",""],
["hairstyle_female_single_004","hairFull","","hairstyle_female_single_004",26704,"#6f6e6f",""],
["hairstyle_female_single_005","hairFull","","hairstyle_female_single_005",26196,"#60433a",""],
["hairstyle_female_single_006","hairFull","","hairstyle_female_single_006",15936,"#d05b5b",""],
["hairstyle_female_single_007","hairFull","","hairstyle_female_single_007",41616,"#61473f",""],
["hairstyle_male_single_001","hairFull","","hairstyle_male_single_001",7244,"#595251",""],
["hairstyle_male_single_002","hairFull","","hairstyle_male_single_002",16560,"#a6a2a1",""],
["hairstyle_male_single_003","hairFull","","hairstyle_male_single_003",12704,"#784a3b",""],
["hairstyle_male_single_004","hairFull","","hairstyle_male_single_004",4476,"#4d4341",""],
["hairstyle_male_single_005","hairFull","","hairstyle_male_single_005",39192,"#40484c",""],
["hairstyle_male_single_006","hairFull","","hairstyle_male_single_006",19312,"#5e3f38",""],
["hairstyle_male_single_007","hairFull","","hairstyle_male_single_007",11644,"#cabab5",""],
["hairstyle_male_single_008","hairFull","","hairstyle_male_single_008",6272,"#947f60",""],
["hat_001","hat","","hat_001",7668,"#5774b5",""],
["hat_002","hat","","hat_002",5692,"#fe944b",""],
["hat_003","hat","","hat_003",5856,"#ac5f46",""],
["hat_004","hat","","hat_004",11416,"#b1c167",""],
["hat_005","hat","","hat_005",5436,"#566c77",""],
["hat_006","hat","","hat_006",6576,"#2b2b2b",""],
["hat_007","hat","","hat_007",4856,"#d6383a",""],
["hat_008","hat","","hat_008",5964,"#7a6a65",""],
["hat_009","hat","","hat_009",5484,"#ffca65",""],
["hat_010","hat","","hat_010",8084,"#fbbe53",""],
["hat_011","hat","","hat_011",15496,"#d16e2a",""],
["hat_012","hat","","hat_012",14144,"#ef799a",""],
["hat_013","hat","","hat_013",16912,"#deb8b9",""],
["hat_014","hat","","hat_014",7712,"#ce8a67",""],
["hat_015","hat","","hat_015",9072,"#e79594",""],
["hat_016","hat","","hat_016",7808,"#b25144",""],
["hat_017","hat","","hat_017",16788,"#9a7a70",""],
["hat_018","hat","","hat_018",6888,"#e0a6a5",""],
["hat_019","hat","","hat_019",14484,"#dd7a18",""],
["hat_020","hat","","hat_020",9000,"#b7bdc1",""],
["hat_021","hat","","hat_021",11092,"#cb7833",""],
["hat_022","hat","","hat_022",6256,"#654c36",""],
["hat_023","hat","","hat_023",9944,"#c0c9cd",""],
["hat_024","hat","","hat_024",9772,"#618f2f",""],
["hat_025","hat","","hat_025",17508,"#deced1","farmer-glass"],
["hat_026","hat","","hat_026",6880,"#896475",""],
["hat_027","hat","","hat_027",21308,"#ae9fa4",""],
["hat_028","hat","","hat_028",8460,"#646c2e",""],
["hat_029","hat","","hat_029",16992,"#8e766f",""],
["hat_030","hat","","hat_030",7484,"#ea9351",""],
["hat_031","hat","","hat_031",51396,"#c073a1",""],
["hat_032","hat","","hat_032",14344,"#5d5e5f","farmer-glass"],
["hat_033","hat","","hat_033",16916,"#658343",""],
["hat_034","hat","","hat_034",8428,"#3a3d3e",""],
["hat_035","hat","","hat_035",10636,"#56738f",""],
["hat_036","hat","","hat_036",5440,"#8197c4",""],
["hat_037","hat","","hat_037",5948,"#54452f",""],
["hat_038","hat","","hat_038",8964,"#91999d",""],
["hat_039","hat","","hat_039",6624,"#e15f57",""],
["hat_040","hat","","hat_040",6376,"#d73334",""],
["hat_041","hat","","hat_041",16252,"#ef9430",""],
["hat_042","hat","","hat_042",21396,"#3f4a8b","farmer-glow"],
["hat_043","hat","","hat_043",9728,"#9e7f64",""],
["hat_044","hat","","hat_044",20764,"#e57b20",""],
["hat_045","hat","","hat_045",14160,"#d3b0b5",""],
["hat_046","hat","","hat_046",8452,"#747078",""],
["hat_047","hat","","hat_047",13652,"#ae7c42",""],
["hat_048","hat","","hat_048",10632,"#7382b8",""],
["hat_single_001","helmet","","hat_single_001",12016,"#da6b34",""],
["hat_single_002","helmet","","hat_single_002",12812,"#c7531f",""],
["hat_single_003","helmet","","hat_single_003",12912,"#6d7179",""],
["hat_single_004","helmet","","hat_single_004",11556,"#d7a291",""],
["hat_single_005","helmet","","hat_single_005",14844,"#59564f",""],
["hat_single_006","helmet","","hat_single_006",12948,"#a2c1d2",""],
["hat_single_007","helmet","","hat_single_007",15016,"#b27e69",""],
["hat_single_008","helmet","","hat_single_008",10292,"#474d51",""],
["hat_single_009","helmet","","hat_single_009",17472,"#819097","farmer-glass+farmer-glow"],
["hat_single_010","helmet","","hat_single_010",9144,"#adb1b4",""],
["hat_single_011","helmet","","hat_single_011",15572,"#375a8c","farmer-glass"],
["hat_single_012","helmet","","hat_single_012",9584,"#455a7b",""],
["hat_single_013","helmet","","hat_single_013",20008,"#3a3b3c","farmer-glass"],
["hat_single_014","helmet","","hat_single_014",26912,"#e06f3c","farmer-glass"],
["hat_single_015","helmet","","hat_single_015",14912,"#697364","farmer-glass"],
["mascot_001","mascot","","mascot_001",22020,"#b1b791",""],
["mascot_002","mascot","","mascot_002",22696,"#987367",""],
["mascot_003","mascot","","mascot_003",16168,"#bc7847",""],
["mascot_004","mascot","","mascot_004",22520,"#74a0c5",""],
["mascot_005","mascot","","mascot_005",19036,"#e87f3c",""],
["mascot_006","mascot","","mascot_006",41640,"#b2632c",""],
["mascot_007","mascot","","mascot_007",24552,"#9ab857",""],
["mascot_008","mascot","","mascot_008",17100,"#e2e6e8",""],
["outfit_001","outfit","","outfit_001",23264,"#7091c3",""],
["outfit_002","outfit","","outfit_002",35144,"#6f95c5",""],
["outfit_003","outfit","","outfit_003",29164,"#68654a",""],
["outfit_004","outfit","","outfit_004",21492,"#afb5b9",""],
["outfit_005","outfit","","outfit_005",21436,"#a27b21",""],
["outfit_006","outfit","","outfit_006",18024,"#a9c3e1",""],
["outfit_007","outfit","","outfit_007",14548,"#d7b0a7",""],
["outfit_008","outfit","","outfit_008",11844,"#576aba",""],
["outfit_009","outfit","","outfit_009",13264,"#3f4143",""],
["outfit_010","outfit","","outfit_010",22552,"#3f97ad",""],
["pants_001","pants","","pants_001",10348,"#272b2d",""],
["pants_002","pants","","pants_002",10884,"#76b3f2",""],
["pants_003","pants","","pants_003",12300,"#cc4044",""],
["pants_004","pants","","pants_004",11328,"#eeeff0",""],
["pants_005","pants","","pants_005",17716,"#3c4042",""],
["pants_006","pants","","pants_006",10272,"#b2b9bd",""],
["pants_007","pants","","pants_007",10964,"#2949ab",""],
["pants_008","pants","pants_003","pants_008",12280,"#545d61",""],
["pants_009","pants","pants_004","pants_009",11348,"#669ae2",""],
["pants_010","pants","","pants_010",16440,"#5a9434",""],
["pants_011","pants","","pants_011",39808,"#838a8f",""],
["pants_012","pants","","pants_012",16248,"#ab7b55",""],
["pants_013","pants","","pants_013",15488,"#818587",""],
["pants_014","pants","","pants_014",16288,"#2e2d2e",""],
["shoe_slippers_001","shoes","","shoe_slippers_001",9504,"#ded2a9",""],
["shoe_slippers_002","shoes","","shoe_slippers_002",9984,"#2e79cf",""],
["shoe_slippers_003","shoes","","shoe_slippers_003",12528,"#9c7750",""],
["shoe_slippers_004","shoes","","shoe_slippers_004",14800,"#5f968e",""],
["shoe_slippers_005","shoes","shoe_slippers_004","shoe_slippers_005",14644,"#6e4b38",""],
["shoe_slippers_006","shoes","","shoe_slippers_006",10856,"#2e302b",""],
["shoe_slippers_007","shoes","","shoe_slippers_007",11556,"#a72a9b",""],
["shoe_sneakers_001","shoes","","shoe_sneakers_001",21492,"#895d4f",""],
["shoe_sneakers_002","shoes","","shoe_sneakers_002",9836,"#53433f",""],
["shoe_sneakers_004","shoes","","shoe_sneakers_004",11972,"#2a2f32",""],
["shoe_sneakers_005","shoes","","shoe_sneakers_005",41548,"#acb1b4",""],
["shoe_sneakers_006","shoes","","shoe_sneakers_006",39492,"#ceaaaa",""],
["shoe_sneakers_007","shoes","","shoe_sneakers_007",21128,"#e56a9d",""],
["shoe_sneakers_008","shoes","shoe_sneakers_007","shoe_sneakers_008",22932,"#c0bebd",""],
["shoe_sneakers_009","shoes","","shoe_sneakers_009",38912,"#c9d1d5",""],
["shoe_sneakers_010","shoes","","shoe_sneakers_010",20860,"#543c34",""],
["shoe_sneakers_011","shoes","","shoe_sneakers_011",47408,"#8d9498",""],
["shoe_sneakers_012","shoes","","shoe_sneakers_012",43268,"#605856",""],
["shoe_sneakers_013","shoes","shoe_sneakers_006","shoe_sneakers_013",39364,"#acabab",""],
["shoe_sneakers_014","shoes","shoe_sneakers_011","shoe_sneakers_014",47404,"#c9744f",""],
["shoe_sneakers_015","shoes","","shoe_sneakers_015",17204,"#63473e",""],
["shorts_001","shorts","","shorts_001",12372,"#28292a",""],
["shorts_002","shorts","","shorts_002",8692,"#efdbce",""],
["shorts_003","shorts","","shorts_003",7080,"#959595",""],
["shorts_004","shorts","shorts_001","shorts_004",12884,"#9ea9af",""],
["shorts_005","shorts","","shorts_005",7980,"#143796",""],
["shorts_006","shorts","","shorts_006",7600,"#cf494d",""],
["socks_001","socks","","socks_001",6332,"#252728",""],
["socks_002","socks","socks_001","socks_002",6424,"#e5e9eb",""],
["socks_003","socks","socks_001","socks_003",6408,"#848f94",""],
["socks_004","socks","socks_001","socks_004",6412,"#5f6163",""],
["socks_005","socks","socks_001","socks_005",6324,"#654a42",""],
["socks_006","socks","","socks_006",10792,"#898a8b",""],
["socks_007","socks","","socks_007",8332,"#262829",""],
["socks_008","socks","","socks_008",7752,"#262a2c",""],
["outwear_001","top","","outwear_001",11736,"#39969c",""],
["outwear_002","top","","outwear_002",10652,"#3e4346",""],
["outwear_003","top","","outwear_003",17012,"#7bbee6",""],
["outwear_004","top","","outwear_004",14824,"#257cb7",""],
["outwear_005","top","","outwear_005",16280,"#e85a24",""],
["outwear_006","top","","outwear_006",17336,"#97646a",""],
["outwear_007","top","","outwear_007",15108,"#a75291",""],
["outwear_008","top","","outwear_008",12576,"#636ea4",""],
["outwear_009","top","","outwear_009",15148,"#ccc7c6",""],
["outwear_010","top","","outwear_010",17668,"#f9bc45",""],
["outwear_011","top","","outwear_011",12816,"#b2c760",""],
["outwear_012","top","","outwear_012",10680,"#e8eaeb",""],
["outwear_013","top","","outwear_013",17012,"#c7474f",""],
["outwear_014","top","","outwear_014",14820,"#5b9738",""],
["outwear_015","top","","outwear_015",16272,"#7b6f75",""],
["outwear_016","top","","outwear_016",17500,"#618789",""],
["outwear_017","top","","outwear_017",15088,"#a14e4f",""],
["outwear_018","top","","outwear_018",12700,"#4d734e",""],
["outwear_019","top","","outwear_019",15612,"#bc9d5f",""],
["outwear_020","top","","outwear_020",17648,"#7cd2f6",""],
["outwear_021","top","","outwear_021",21036,"#fccea0",""],
["outwear_022","top","","outwear_022",24848,"#98acae",""],
["outwear_023","top","","outwear_023",16800,"#25282a",""],
["outwear_024","top","","outwear_024",18160,"#383b42",""],
["outwear_025","top","","outwear_025",21036,"#ed96b2",""],
["outwear_026","top","","outwear_026",19444,"#3f509b",""],
["outwear_027","top","","outwear_027",22860,"#dda0a1",""],
["outwear_028","top","","outwear_028",11040,"#e9e5e3",""],
["outwear_029","top","","outwear_029",17864,"#99aad7",""],
["outwear_030","top","","outwear_030",14244,"#fea61a",""],
["outwear_031","top","","outwear_031",18196,"#6e7679",""],
["outwear_032","top","","outwear_032",18984,"#7e4b3a",""],
["outwear_033","top","","outwear_033",21216,"#bfa141",""],
["outwear_034","top","","outwear_034",11204,"#ea403b",""],
["outwear_035","top","","outwear_035",20776,"#4b745e",""],
["outwear_036","top","","outwear_036",9196,"#dd347b",""],
["outwear_037","top","","outwear_037",23336,"#cb565a",""],
["outwear_038","top","","outwear_038",28816,"#cd3b37",""],
["outwear_039","top","","outwear_039",29500,"#559de2",""],
["outwear_040","top","","outwear_040",28092,"#ee670e",""],
["outwear_041","top","","outwear_041",25968,"#f18ba7",""],
["outwear_042","top","","outwear_042",26708,"#45535a",""],
["outwear_043","top","","outwear_043",21436,"#eb9837",""],
["outwear_044","top","","outwear_044",19496,"#cf4542",""],
["outwear_045","top","","outwear_045",14440,"#6d6f70",""],
["outwear_046","top","","outwear_046",22656,"#f8cda6",""],
["outwear_047","top","","outwear_047",17368,"#676e72",""],
["outwear_048","top","","outwear_048",21004,"#66b688",""],
["outwear_049","top","","outwear_049",22412,"#57595a",""],
["outwear_050","top","","outwear_050",17752,"#f17201",""],
["outwear_051","top","","outwear_051",17812,"#5f6b2e",""],
["outwear_052","top","","outwear_052",16628,"#ee5e6e",""],
["outwear_053","top","","outwear_053",15460,"#b98d32",""],
["outwear_054","top","","outwear_054",15324,"#75314e",""],
["outwear_055","top","","outwear_055",17588,"#c13e9d",""],
["outwear_056","top","","outwear_056",18056,"#3b3e40",""],
["outwear_057","top","","outwear_057",30880,"#656e72",""],
["outwear_058","top","","outwear_058",26480,"#8e7063",""],
["outwear_059","top","","outwear_059",32060,"#9d5e50",""],
["outwear_060","top","","outwear_060",17040,"#90b7e9",""]
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
export const FARMER_PARTS=Object.freeze(Object.fromEntries(MEASURED.map(([id,group,style,files,bytes,colour,materials])=>{
 const [name,fit,flags='']=group==='face'?faceName(id):group==='body'?[BODY_NAMES[id],Number(id.slice(-3))>=9&&Number(id.slice(-3))<=13?'p':'u']:(NAMES[id]??`${id}|p`).split('|');
 return [id,Object.freeze({id,group,slot:FARMER_GROUPS[group].slot,name,fit:FIT[fit],earned:FARMER_GROUPS[group].earned,coversFace:flags.includes('c'),
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
// nothing that clashes, and (with `owned`: the ids a farmer has earned) no earned part they do not have. Returns {ok:true} or
// {ok:false,error} with a short English reason (for logs, never shown as it is).
export function validFarmerConfig(config,{owned=null}={}){
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
