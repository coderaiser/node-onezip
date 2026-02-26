import findit from 'findit2';
import inhale from './inhale.js';

const getFirst = ([a]) => a;

export default async (filename) => {
    const finder = findit(filename);
    
    const {
        file,
        directory,
        link,
    } = await inhale(finder, ['file', 'directory', 'link']);
    
    const names = [
        ...file.map(getFirst),
        ...directory.map(getFirst),
        ...link.map(getFirst),
    ];
    
    return {
        file,
        directory,
        link,
        names,
    };
};
