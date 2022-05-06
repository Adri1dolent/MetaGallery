const tsb = await fetch('https://cristal.univ-lille.fr/pirvi/pages/projects')
const text = await tsb.text()

export function getImgList() {
    const regex = new RegExp(/https:\/\/cristal\.univ-lille\.fr\/pirvi\/images\/projects\/.*\.png/g)
    return text.match(regex)
}

export async function getProjectText() {
    const findReg = new RegExp(/onclick="window\.location='.*'/g)
    const matches = text.match(findReg)
    let projetcsUrls = []
    const replaceReg = new RegExp(/onclick="window\.location=/g)
    matches.forEach(e => {
        e = e.replaceAll(replaceReg, "")
        e = e.replaceAll(new RegExp(/'/g), "")
        projetcsUrls.push(e)
    })
    let projectsText = []
    for (const u of projetcsUrls) {
        const resp = await fetch(u)
        const t = await resp.text()
        const findReg = new RegExp(/<div class="page-content">.*?<\/div>/gms)
        const found = t.match(findReg)
        projectsText.push(stripHtml(found))
    }
    return projectsText
}

function stripHtml(html)
{
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

//https://cristal.univ-lille.fr/pirvi/images/projects/vairdraw/thumbnail.png
//https://cristal.univ-lille.fr/pirvi/projects/VAirDraw/