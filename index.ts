import * as fs from 'node:fs';
import * as path from 'node:path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { spawn } from 'node:child_process';

const templates: string[] = [
    'vanilla-ts',
    'vue-ts',
    'react-ts',
    'preact-ts',
    'lit-ts',
    'svelte-ts',
    'solid-ts',
    'qwik-ts'
];

function getRandomTemplate(): string {
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
}

function executeCommand(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const process = spawn('npx', [command, ...args], {
            cwd,
            stdio: 'inherit',
            shell: true,
            env: { FORCE_COLOR: 'true' }
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

async function createViteProject(projectPath: string): Promise<void> {
    try {
        const projectName = path.basename(projectPath);
        const template = getRandomTemplate();
        
        await executeCommand('create-vite', [
            projectName,
            '--template',
            template
        ], path.dirname(projectPath));

        fs.writeFileSync(
            path.join(projectPath, 'TEMPLATE.md'),
            `This project was created with the ${template} template.`
        );

        console.log(`Created Vite project: ${projectName} with template: ${template}`);
    } catch (error) {
        console.error(`Error creating Vite project: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function scrapeAndCreateFolders(): Promise<void> {
    try {
        const response = await axios.get('https://store.selfteach.me/view/courses/advent-of-javascript-2024/2872740-challenge-1-show-hide-password/9303349-challenge-1-project-files');
        const $ = cheerio.load(response.data);

        const promises = $('nav[aria-label*="Challenge"]').map(async (_, element) => {
            const challengeName = $(element).attr('aria-label');
            if (!challengeName) return;

            const folderName = challengeName
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');

            const folderPath = path.join(process.cwd(), folderName);
            
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log(`Created folder: ${folderName}`);
                
                await createViteProject(folderPath);
            }
        }).get();

        await Promise.all(promises);
        
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
    }
}

if (require.main === module) {
    scrapeAndCreateFolders().catch(console.error);
}
