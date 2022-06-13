# rlworkbench
RL Workbench - A comprehensive, interactive framework for RL experimentation

The code consists of two main parts:
- The **python-backend** is a Python webserver and collection of tools 
which provides functionality to _setup and explore_ training environments, _initiate_ training
runs and _benchmark_ trained agents. It serves functionality at a routing API or via standalone modules
such as the _trainer_, which can be called from the command line to initiate training runs.
- The **react-frontend** directory contains the code for a Javascript/React-based webtool, which serves as a
frontend provided to the _experiment\_server_ backend.

You can run a docker-compose stack by running `docker-compose up`. You do not need to install the requirements in this case.

## Experiment Server

Make sure to have have git lfs intalled (e.g. via `brew install git-lfs`, `git install lfs`and then use `git lfs pull`):

All requirements can be installed via

```pip install -r requirements.txt```

We recommend the use of virtual env or similar. To use the gpu-enabled version of PyTorch,
you have to install PyTorch via the official website https://pytorch.org/get-started/locally/.

## Web Application

The web application is served via the experiment server. A Javascript distributable bundle is already
available in the repository, and should run out of the box. 
If you want to build the web application yourself:
1. Make sure to have `npm`,`yarn` or an equivalent package manager installed. Switch to the tool
directory via `cd tool` and run `npm install` to install all packages specified in `package.json`.
2. Now run either `npm run build` to create a production build or `npm run dev-build` for
a debug build.
3. Restart the experiment server if the the build ran sucessfully to serve the new bundle.


## Run the Application

Run the application by using docker and the given `docker-compose.yml`.
Alternative you can start the experiment server manually by running `python app.py` and the frontend by
running `npm start`.

You can access the tool via the following URL: http://localhost:8080/.


## Disclaimer

The experiment server was tested on both Windows 10 and macOS. The web application
was tested both on Chrome and Firefox.

This project is still in its prototype stage and may contain bugs. Be aware, that specific steps,
 e.g. the benchmarking of trained agents for  many steps may take a lot of time. Raise your questions
 to **@ymetz**.


