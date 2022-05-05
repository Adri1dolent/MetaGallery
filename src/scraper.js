const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

export default function getImageLinks(){

    const vgmUrl= 'https://cristal.univ-lille.fr/pirvi/pages/projects/';

    const isMidi = (link) => {
        // renvoie false si l'attribut href n'est pas présent
        if(typeof link.href === 'undefined') { return false }

        return link.href.includes('https://cristal.univ-lille.fr/pirvi/images');
    };

    const noParens = (link) => {
        // Expression Régulière qui détermine si le texte comporte des parenthèses.
        const parensRegex = /^((?!\().)*$/;
        return parensRegex.test(link.textContent);
    };

    (async () => {
        const response = await got(vgmUrl);
        const dom = new JSDOM(response.body);

        // Créée un tableau à partir des éléments HTML pour les filtrer
        const nodeList = [...dom.window.document.querySelectorAll('a')];

        nodeList.filter(isMidi).filter(noParens).forEach(link => {
            console.log(link.href);
        });
    })();
}