## Development server

- Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.
- run app in public ip: 
`ng serve --port 4201 --host 0.0.0.0`

## Install
```shell
nvm use v18
rm -rf .angular/
sudo rm -f package-lock.json
sudo rm -rf node_modules
ng cache clean
npm cache clean --force

sudo npm install
# edit server url
sudo nano src/enviroment/enviroment.ts
# run 
ng serve --port 4201 --host 0.0.0.0 --verbose
```

## add to auto run
``` shell
npm install pm2@latest -g
chmod +x ./datalogger-frontend.sh
pm2 start ./datalogger-frontend.sh
pm2 save
# restart service
pm2 restart datalogger-frontend.sh
```


## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## kill server
```bash
# find process id 
lsof -i :4201
# kill process
kill -9 pid
```


## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.


### run fronend 
```shell
nvm use v18
# install http-server if it is not installed
npm install -g http-server

# change the server address
nano .\src\enviroment\enviroment.ts
# build app
ng build --configuration=production

nano dist/kitkat/index.html
# change the following line
<base href="/"> => <base href="./">
# copy the frontend app(`kitkat` directory into the `frontend`directory of backend)

# start service: 
pm2 restart datalogger-front.sh
```



## Web application account  
- tzone website account  
```
pankaj@ithrue.com 
titcod-Bossy7-kecdyr
```
- Account of `ibtrace.com`
```shell
Admin ID:
admin@icebattery.com
icebattery123


Alfresa ID:
alfresa@alfresa.co.jp
Alfresa12345

Zen nisshoku ZNS
ZNS ID: zns@zchain.co.jp
PW:12345678

```



### How to deploy app
- change environment
open `app/environment/environment.ts` and edit server url
``` shell
apiURL: 'https://www.ibtrace.com/tzoneserver/api',
socketUrl:'wss://www.ibtrace.com/tzoneserver/'  
```
- build app
`shell
ng build --configuration=production
`
open index.html and change the <base href '/'> to <base href '/tzone/>

* create a soft link of source directory
`ln -l /home/ubunut/tzone/front2/ /var/www/html-tzone`

* add proxy of 443 and 80 port in main domain in /etc/apache2/sites-available/ibt-le-ssl.conf
```shell
ProxyPass /tzone http://tzone.ibtrace.com
ProxyPassRevers /tzone http://tzone.ibtrace.com
```

* open configuration file(`/etc/apache2/sites-available/tzone-le-ssl.config`) and set the document root of subdomain tzone.ibtrace.com into `/var/www/html-tzone`
* restart apache2 
`sudo systemctl restart apache2`


### Configura apache2 to listen on 18801 port of domain
- Install following dependency
`sudo apt-get install libapache2-mod-proxy-tcp`

- add apache configuration in `/etc/apache2/sites-available/ibt-le-ssl.conf` file
```shell
<VirtualHost *:18801>
    ServerName www.ibtrace.com
    ProxyPass / tcp://127.0.0.1:18801
    ProxyPassReverse / tcp://127.0.0.1:18801
</VirtualHost>
```


## Read Device status command  
```
*000000,040,201#
```