const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const client = new Client({
   authStrategy: new LocalAuth()
});


client.on('qr', (qr) => {
   qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (message) => {
   const re = new RegExp('(?<=\\[\\[)(.*?)(?=\\]\\])', "g");
   var r  = message.body.match(re);
   if(r){
      let flFirst = true;
      let scryfall = await getImgScryFall(r);
      if(scryfall){
         for (const element of r) {
            let detalle = scryfall.find((carta) => {
               if (carta.card_faces){
                  let caras = carta.name.split(' // ');
                  for (const caraName of caras) {
                     if(caraName.toUpperCase() === element.toUpperCase()){
                        return true;
                     };
                  };
                  return false;            
               }else{
                  return carta.name.toUpperCase() === element.toUpperCase();
               }
            });

            if (detalle){
               let descripcion =  (detalle.prices.usd ? "$" + detalle.prices.usd + " - " : "") + detalle.scryfall_uri;
               if(detalle.image_uris){
                  let media = await MessageMedia.fromUrl(detalle.image_uris.normal);
                  if(flFirst){
                     await message.reply(media, message.from, { caption: descripcion });
                     flFirst=false;
                  }else{
                     await client.sendMessage(message.from, media, { caption: descripcion });
                  }
               }else{
                  let fldouble = true;
                  for (const detalle2 of detalle.card_faces) {
                     let media = await MessageMedia.fromUrl(detalle2.image_uris.normal);
                     if(flFirst){
                        await message.reply(media, message.from, { caption: fldouble ? '' : descripcion });
                        flFirst=false;
                     }else{
                        await client.sendMessage(message.from, media, { caption: fldouble ? '' : descripcion });
                     }
                     fldouble = false;
                  }
               }
            }
         };
      }
   }
});
 
function getImgScryFall(array){
   return new Promise(async (resolve) => {
      var cartas='';
      array.forEach(element  => {
         cartas+=' "' + element + '" OR'
      });
      let URL = 'https://api.scryfall.com/cards/search?q=(game:paper)' + cartas;

      let resp=[];
      let continuar = true;
      //console.log(URL);
      while(continuar){
         try {
            var response = await axios.get(URL);
            //console.log(response.data.data);
            if(response.data){
               if(response.data.has_more){
                  URL=response.data.next_page;
                  resp=resp.concat(response.data.data)
               }else{
                  continuar = false;
                  resp=resp.concat(response.data.data)
                  resolve(resp);
               }
            }
         } catch (error) {
            console.log('Error axios', error);
            continuar = false;
         }
      }
   });
}

client.initialize();