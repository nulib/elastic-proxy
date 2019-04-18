FROM node:10-alpine
MAINTAINER Michael B. Klein
RUN npm install yarn -g
COPY --chown=node:node . /var/app
USER node
WORKDIR /var/app
RUN yarn install
CMD yarn start
EXPOSE 3334
HEALTHCHECK CMD wget -q http://localhost:3334/auth/whoami
