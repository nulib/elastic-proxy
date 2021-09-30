FROM node:14-alpine
COPY --chown=node:node ./src /var/app
USER node
WORKDIR /var/app
RUN npm install
CMD npm run-script start
EXPOSE 3334
HEALTHCHECK CMD wget -q http://localhost:3334/auth/whoami
