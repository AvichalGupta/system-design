const fs = require('fs');
const path = require('path');
const process = require('process');
const readline = require('readline');
const { spawn } = require('child_process');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'dist')
class Node {
    name;
    path;
    children;
    depth;
    type;
    constructor(name, path, depth = 0, isFile = false) {
        this.name = name;
        this.path = path;
        this.depth = depth;
        this.children = [];
        this.type = !isFile ? 'folder' : 'file';
    }
    
    getChildren() {
        return this.children;
    }

    getPath() {
        return this.path;
    }

    getDepth() {
        return this.depth;
    }

    getName() {
        return this.name;
    }

    getType() {
        return this.type;
    }
}

function createFolderTree(folderTreeNode) {
    
    const parentPath = folderTreeNode.getPath();
    const readResults = fs.readdirSync(parentPath, { encoding: 'utf-8', withFileTypes: true });

    for (let i = 0; i < readResults.length; i++) {            
        
        const folderOrFile = readResults[i];

        const childNode = new Node(folderOrFile.name, path.join(parentPath, folderOrFile.name), folderTreeNode.getDepth() + 1, folderOrFile.isFile());
        folderTreeNode.children.push(childNode);
        
        if (folderOrFile.isDirectory()) {
            createFolderTree(childNode);
        }
    }
}

function getFiles() {
    const folderTree = new Node('dist', OUTPUT_PATH);
    createFolderTree(folderTree);

    const foldersAndFilesNames = [];

    const stack = [[folderTree, 0]];
    let node = null;
    let parentChildCount = 0;
    let parentNode = null;

    while (stack.length) {

        parentNode = stack.pop();

        parentChildCount = parentNode[1];
        node = parentNode[0];

        foldersAndFilesNames.push({ 
            name: node.getName(), 
            parentsChildCount: parentChildCount, 
            depth: node.getDepth(),
            currentNodeChildCount: node.getChildren().length,
            isFile: node.getType() === 'file',
            path: node.getPath()
        })
        
        for (const childNode of node.getChildren()) {
            stack.push([childNode, node.getChildren().length]);
        }
    }

    const finalFolderAndFilesText = [];
    const fileIds = [];

    for (const idx in foldersAndFilesNames) {
        const node = foldersAndFilesNames[idx];
        if (node.isFile) {
            fileIds.push(idx);
        }
        finalFolderAndFilesText.push(draw(node, node.isFile && fileIds.length === 1));
    }

    repaint(finalFolderAndFilesText);

    takeInputs(foldersAndFilesNames, finalFolderAndFilesText, fileIds);
}

function draw(node, addHighlight = false) {
    let tempStr = '';
    if (!node.isFile) {
        if (node.parentsChildCount > 1) {
            tempStr += '\n';
            for (let i = 0; i < node.depth; i++) {
                tempStr += '  ';
            }
        }
        tempStr += '\x1b[32;1m/' + node.name + '\x1b[0m'
    } else {
        tempStr += '\n';
        for (let i = 0; i < node.depth; i++) {
            tempStr += '  ';
        }
        if (addHighlight) {
            tempStr += '\x1b[37;1m\u25B6  ' + node.name + '\x1b[0m';
        } else {
            tempStr += '\x1b[33;1m' + node.name + '\x1b[0m';
        }
    }
    return tempStr;
}

function takeInputs(foldersAndFilesNames, finalFolderAndFilesText, fileIds) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode?.(true); 
    let counter = 0;

    process.stdin.on('keypress', (_, key) => {
        switch (key.name) {
            case 'q': {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                console.log('\nBye!');
                process.exit(0);
            }
            case 'up': {
                
                counter = Math.max(0, Math.min(counter, fileIds.length - 1));

                if (counter === 0) {
                    break;
                }
                
                const prevNodeId = fileIds[counter];
                finalFolderAndFilesText[prevNodeId] = draw(foldersAndFilesNames[prevNodeId], false);
                
                counter--;
                
                const nextNodeId = fileIds[counter];
                finalFolderAndFilesText[nextNodeId] = draw(foldersAndFilesNames[nextNodeId], true);
                
                repaint(finalFolderAndFilesText);

                break;
            }
            case 'down': {

                counter = Math.max(0, Math.min(counter, fileIds.length - 1));

                if (counter === fileIds.length - 1) {
                    break;
                }

                const prevNodeId = fileIds[counter];
                finalFolderAndFilesText[prevNodeId] = draw(foldersAndFilesNames[prevNodeId], false);
                
                counter++;
                
                const nextNodeId = fileIds[counter];
                finalFolderAndFilesText[nextNodeId] = draw(foldersAndFilesNames[nextNodeId], true);
                
                repaint(finalFolderAndFilesText);
                
                break;
            }
            case 'return': {
                
                const currentNodeId = fileIds[counter];
                const currentNode = foldersAndFilesNames[currentNodeId];
                const filePath = currentNode.path;

                counter = Math.max(0, Math.min(counter, fileIds.length - 1));

                process.stdin.pause();

                const proc = spawn(
                    'npm',
                    ['run', 'runfile', '--', filePath],
                    { stdio: 'inherit', shell: true }
                );

                proc.once('exit', code => {
                    process.stdin.setRawMode(false);
                    process.stdin.resume();
                    if (code !== 0) {
                        console.log(`\nrunfile exited with code ${code} for filePath ${filePath}\n`);
                        process.exit(0);
                    }
                    process.exit(1);
                });

                break;
            }
        }
    });
}

function repaint(finalFolderAndFilesText) {
    console.clear();
    console.log(`\n\tUse the \n\t'up', 'down' arrow keys to navigate files \n\t'Enter' key to run the file \n\t'q' key to quit the program\n`);
    console.log(finalFolderAndFilesText.join(''));
}

getFiles();