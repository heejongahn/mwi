import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'mz/fs';
import * as childProcess from 'child-process-promise';

const questions = [
  {
    name: 'name',
    message: 'First off, what\'s the name of your project?',
    default: 'coolApp',
  },
  {
    name: 'description',
    message: 'A brief description, please.',
    default: 'An application cooler than DJ Kool Herc',
  },
  {
    type: 'list',
    name: 'spa',
    message: 'Do you have any specific SPA library in your mind?',
    choices: [
      'react',
      'angular',
      'angular2',
      'Nothing',
    ],
  },
  {
    type: 'checkbox',
    name: 'additional',
    message: 'I suppose some of these might come handy..',
    choices: answer => {
      const base = ['jquery', 'whatwg-fetch', 'eslint'];
      switch (answer.spa) {
        case 'react':
          return base.concat(['redux', 'react-router']).sort();
        case 'angular':
        case 'angular2':
          return base.concat(['angular-material']).sort();
        default:
          return base.sort();
      }
    },
  },
  {
    type: 'list',
    name: 'frontend',
    message: 'Fantastic! For the frontend framework?',
    choices: [
      'bootstrap',
      'semantic-ui',
      'Nothing',
    ],
  },
  {
    type: 'list',
    name: 'buildTool',
    message: 'And what\'s your build/bundling tool?',
    choices: [
      'webpack',
      'rollup',
      'Nothing',
    ],
  },
  {
    type: 'confirm',
    name: 'es6',
    message: 'Last but not least, you\'re gonna write ES6, aren\'t you?',
    default: true,
  },
];

const parseAnswer = (answer) => {
  const { name, spa, additional, frontend, buildTool, es6 } = answer;
  const packages = [spa, frontend, buildTool]
    .filter(item => item !== 'Nothing')
    .concat(additional);

  if (es6) {
    packages.push('babel-polyfill')
    if (spa === 'react') packages.push('babel-preset-react')

    if (buildTool === 'webpack') {
      packages.push(...[
        'babel-loader',
        'babel-preset-es2015',
      ]);
    } else if (buildTool === 'rollup') {
      packages.push(...[
        'rollup-plugin-babel'
        'babel-preset-es2015-rollup',
      ]);
    }
  }

  packages.sort();

  return { name, packages };
};

const createGitignore = (location) =>
  fs.writeFile(path.join(location, '.gitignore'), 'node_modules/\ndist/');


const npmInit = (location, packageInfo) => {
  const scripts = { lint: 'node_modules/.bin/eslint src/index.js' };
  if (packageInfo.packages.includes('webpack')) {
    scripts.build = 'node_modules/.bin/webpack';
  } else {
    scripts.build = 'node_mobules/.bin/rollup';
  }

  return fs.writeFile(
    path.join(location, 'package.json'),
    JSON.stringify({
      name: packageInfo.name,
      version: '0.0.1',
      main: 'dist/index.js',
      scripts,
    }))
    .then(err => {
      if (err) { throw new Error(err); }
      return childProcess.spawn(
        'npm',
        ['install', '--save', ...packageInfo.packages],
        { cwd: location, capture: ['stdout', 'stderr'] }
      );
    });
};

export default () => {
  let packageInfo;
  let projectPath;

  inquirer
    .prompt(questions)
    .then(answer => {
      packageInfo = parseAnswer(answer);
      projectPath = path.join(process.cwd(), packageInfo.name);
    })
    .then(() => {
      console.log('Your answer:');
      Object.keys(packageInfo)
        .map(index => console.log(`${index}: ${packageInfo[index]}`));
    })
    .then(() => fs.mkdir(projectPath))
    .then(err => {
      if (err) { throw new Error(err); }
      return createGitignore(projectPath);
    })
    .then(err => {
      if (err) { throw new Error(err); }
      console.log('✔︎ Created folder and gitignore');
    })
    .then(() => npmInit(projectPath, packageInfo))
    .then(result => {
      if (result.stderr) { throw new Error(result.stderr); }
      console.log('✔︎ Initialized npm and installed dependencied');
    })
    .catch(e => console.log(e.message));
};
