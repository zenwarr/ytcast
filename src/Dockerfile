FROM node:16

EXPOSE 8080
ENV PORT=8080

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/bin/yt-dlp && \
    chmod a+rx /usr/bin/yt-dlp && \
    apt update && \
    apt install -y ffmpeg

USER node

COPY --chown=node . /app
WORKDIR /app

RUN yarn install --frozen-lockfile --production=false && \
    yarn build

USER root
RUN rm -rf /yarn-cache
USER node

ENTRYPOINT [ "node", "/app/index.js" ]
