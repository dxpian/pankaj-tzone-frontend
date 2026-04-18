## Install application
- select node version v17
`nvm use v17`
- install dependencies
`npm i`
- install angular dependency
```shell
ng add @angular/material
```
## Run applicatoin 
- open `src/enviroment/enviroments.ts` file, change the api url
```bash
# local server url
apiURL: 'http://localhost:9000/api'
# cloud server url
apiURL: 'http://18.179.192.214:9000/api',
```
- run in development mode  
```bash
nvm use v17
chmod +x ./runsh
./runsh
```

- run software in background
`./run.sh`
- kill process
```bash
# find process id 
lsof -i :4201
# kill process
kill -9 pid
```



