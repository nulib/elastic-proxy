FROM node:10-alpine
MAINTAINER Michael B. Klein
COPY . /home/node/app
RUN npm install yarn -g && \
    chown -R node:node /home/node/app
USER node
WORKDIR /home/node/app
RUN yarn install
CMD yarn start
EXPOSE 3334
HEALTHCHECK CMD wget -q http://localhost:3334/auth/whoami
