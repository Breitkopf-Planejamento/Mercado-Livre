const pup = require("puppeteer");
const x1 = require('excel4node');
const linkTo = require('./links');

let data = new Date();
let hoje = data.getDay() + '/' + (data.getMonth()+1) + "/" + data.getFullYear(); //para controle de data 
var contador = 1; // para verificar quantidade de anúncio everificar quandro trocar de página.
var pagina = 1; //  indice de controle das páginas
var qtd = 10; //quantidade de páginas que serão raspadas
const titles = [
    "Anúncio", "Valor", "Qtd Vendida", "Link", "Loja", "Itens vendidos na Loja em 60 dias", " Tipo do Produto", "Data"
];
const wb =  new x1.Workbook();
const ws = wb.addWorksheet(data.getDay() + '-' + (data.getMonth()+1) + "-" + data.getFullYear());

//Função Assíncrona para raspagem.

(async () =>{
    const browser = await pup.launch({headless: true});
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if(req.resourceType() === 'image' || //desativa imagens
            req.resourceType() === 'stylesheet'  // desativa css 
            || req.resourceType() ==='font' )
            {
                req.abort();
        }else{
            req.continue()
        }
    })
    for(let i=0; i < linkTo.urls.length; i++){
    let url = linkTo.urls[i];
    let tipo = linkTo.tipos[i];    
        while(pagina < qtd ){
            try {
                await page.goto(url)
                
            } catch (TimeoutError) {
                console.log("Erro na Conexão com o Mercado Livre, esperando até o restabelecimento da conexão")
                await new Promise(r => setTimeout(r, 200000));
                await page.goto(url)
            } 
            
            const links = await page.$$eval('.ui-search-result__image > a', e1 => e1.map(link => link.href));
            for (const link of links){
                console.log('Raspagem:', i+1,' Página:', pagina, ' Anúncio:',
                 contador, Math.round((contador / ((qtd*54)*linkTo.urls.length)) * 10000)/100, '% concluído'); //printa no console que página e qual anúncio está inserido
                await page.goto(link);
                await page.waitForSelector('.ui-pdp-subtitle');
                await page.waitForTimeout(200);
                var centavos = ",00";
                if (await page.$('.andes-money-amount__cents--superscript-36') !==null){
                    centavos =  (',' + await page.$eval('.andes-money-amount__cents--superscript-36', element => element.innerText))} 
                const nome = await page.$eval('.ui-pdp-title', element => element.innerText);
                const reais = await page.$eval ('.ui-pdp-price__second-line > .andes-money-amount--compact > .andes-money-amount__fraction', element => element.innerText);
                const valor = reais + centavos;
                const vendas = (await page.$eval('.ui-pdp-subtitle', element => element.innerText)).substring(7).replace(" vendido", "").replace("s", "");
                let vendasVendedor60Dias = 0;
                if(await page.$('.ui-pdp-seller__sales-description')!==null){
                    vendasVendedor60Dias =  await page.$eval('.ui-pdp-seller__sales-description', element => element.innerText)
                }
                await page.waitForSelector('.ui-pdp-media__action.ui-box-component__action');
                let nomeVendedor = decodeURI((await page.$eval('.ui-pdp-media__action.ui-box-component__action',
                 element => element.href)).replace("https://perfil.mercadolivre.com.br/", "").replace("+", " "));
                if(nomeVendedor.indexOf("?")>1){
                    nomeVendedor = nomeVendedor.substring(0, nomeVendedor.indexOf("?"))
                }
                const obj = {nome, valor, vendas, link, nomeVendedor, vendasVendedor60Dias, tipo, hoje};1
                contador++;
                let headingColumnIndex =1;
                titles.forEach(titulo => {
                    ws.cell(1, headingColumnIndex++).string(titulo)
                });
            
                let rows = contador+1;
                let columnIndex = 1;
                Object.keys(obj).forEach(columnName =>{
                        ws.cell(rows, columnIndex++).string(obj[columnName])
                });
                ;
                wb.write('Mercado_Livre.xlsx');
            }
            try {
                await page.goto(url)
            } catch (TimeoutError) {
                console.log("Erro na conexão com o Mercado Livre, esperando até o restabelecimento da conexão")
                await new Promise(r => setTimeout(r, 200000));
                await page.goto(url)
            } 
            if (await page.$('.andes-pagination__button--next')!==null){
                url = await page.$eval('.andes-pagination__button--next > a', (elm) => elm.href) // url atualizado com a página mãe atual
                pagina++
            }
        }
        pagina=1;//retorna o contador de Páginas
    }

    await browser.close();
    console.log("Raspagem Concluída com Sucesso!")
})();







