---
description: Ejecuta tests, lint y validacion de canales y resume los resultados
---

Verifica el estado del proyecto ejecutando, en este orden:

1. `npm test`
2. `npm run lint`
3. `npm run channels:lint -- sites/movistarplus.es/movistarplus.es.channels.xml`
4. `npm run channels:validate -- sites/movistarplus.es/movistarplus.es.channels.xml`

Si se indica un fichero de canales concreto, usalo en los pasos 3 y 4 en lugar del maestro: $ARGUMENTS

Al terminar, resume en una tabla que paso y que fallo. Para cada fallo, indica el fichero y la
causa probable. No corrijas nada salvo que se pida expresamente.
