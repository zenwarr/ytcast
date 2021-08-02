FROM node:16

EXPOSE 8080
ENV PORT=8080

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global && \
    curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
    chmod a+rx /usr/local/bin/youtube-dl

COPY . /app
WORKDIR /app

RUN yarn install --frozen-lockfile --production=false && \
    yarn build-client && yarn build-server

ENTRYPOINT [ "node", "/app/index.js" ]
