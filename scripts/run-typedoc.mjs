import TypeDoc from 'typedoc';
import fs from 'fs';

(async () => {
    const app = new TypeDoc.Application();
    app.options.addReader(new TypeDoc.TSConfigReader());
    app.options.addReader(new TypeDoc.TypeDocReader());
    app.bootstrap({
        options: JSON.parse(fs.readFileSync('./typedoc.json', 'utf8'))
    });
    const project = app.convert();
    if (!project) {
        console.error('TypeDoc: no project generated');
        process.exit(1);
    }
    await app.generateDocs(project, './docs/api').catch(err => {
        console.error('generateDocs error', err);
        process.exit(1);
    });
    console.log('TypeDoc finished');
})();
