# CITEL
A basic asterisks telephony server interface. Only core features are provided. This project could be seen as a base for any further development. I stopped working on this python3 + HTML5 + JQuery implementation. Currently I'm rebuilding parts with react and python. 

The code includes:

- HTML5/JQuery-frontend
- python3 flask based backend
- configs for dnsmasq and others

Functionalities implemented:

- config generation for asterisk (generate users, trunk configs and dnsmasqconfigs)
- deployment for unity and yealink phones
- management of deployed phones (saving their status in .json files)
- status view (trunk, users, system)

## Getting started
Run the following commands to get the server as it is right now running. 
```
git clone https://github.com/Citos-CTI/CITEL.git
cd CITEL
pip3 install -r requirements.txt
python3 install.py
python3 main.py
```
## Project status
finished - (not longer in development)

Login screen:
![alt text](https://github.com/Citos-CTI/CITEL/blob/master/readme_imgs/login.PNG)
