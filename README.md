# MetaGallery
This project's goal is to make a gallery that would display PIRVI's latest projects as art pieces.

Launch locally:

```bash
npm install
```

```bash
npm run dev
```

Expose to network:

```bash
vite --host
```

# TODO pour déploiement sur site pirvi

ProjectsImgList et EquipmentsImgList contiennent des liens vers des fichiers image locaux
et sont utilisé ensuite pour appliquer ces images à des objects en forme de toiles
dans la simulation. Ces liens doivent à terme être des liens distant (url), pour cela un fichier 
"scrapper.js" a été créé qui permet de scrapper les pages "https://pirvi.univ-lille.fr/pages/equipment/"
et "https://pirvi.univ-lille.fr/pages/projects/" à la recherche des liens des images
correspondants aux projets via une regex. Il se peut que ce code doive être adapté.
Finalement le tableau "tabData" contient les liens des captures d'écran locaux des pages des projets
détaillés. À terme ces captures d'écran devraient être disponible directement sur le serveur du pirvi
et il faudrait donc les récupérer de la même façon.

La création de la majorité des objets ("dynamiquement") se fait entre la ligne 183 et 188 dans index.js.
Il est donc possible de s'inspirer du code pour créer de nouvelles pièces notamment à l'aide des méthodes 
"createRoom" et "createCouloir".

Les "titres" des œuvres sont, eux aussi, dynamiques, ils sont créés grace au lien qui est fournis au TextureLoader,
autrement dit une image "https://truc.com/images/chat/thumbnail.png" aura pour titre "chat", il se peut que ces liens soient 
différents et que le code doivent être modifié (index.js:427)
