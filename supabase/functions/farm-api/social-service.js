export async function handleSocial({admin,body,user}){
 const {data,error}=await admin.rpc('harvest_social',{p_player:user.id,p_action:body.action??{kind:'read'},p_request:body.requestId??null});
 if(error){if(['P0001','23505','22P02','23514'].includes(error.code))return {status:422,data:{profile:{player_id:user.id},error:error.code==='23505'?'You have already used this daily interaction.':error.code==='P0001'?error.message:'Choose a valid social action.'}};throw error;}
 return {status:200,data:{profile:{player_id:user.id},social:data}};
}
