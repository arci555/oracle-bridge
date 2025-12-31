FROM node:18-bullseye

# Variables de entorno Oracle
ENV TZ=UTC
ENV NLS_LANG=.AL32UTF8

WORKDIR /app

# Dependencias para Instant Client y compilación
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     libaio1 wget unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Descargar e instalar Oracle Instant Client Basic Light 21
RUN mkdir -p /opt/oracle \
  && wget -O /opt/oracle/instantclient-basiclite-linux.x64-21.12.0.0.0dbru.zip \
       "https://download.oracle.com/otn_software/linux/instantclient/2112000/instantclient-basiclite-linux.x64-21.12.0.0.0dbru.zip" \
  && cd /opt/oracle \
  && unzip instantclient-basiclite-linux.x64-21.12.0.0.0dbru.zip \
  && rm instantclient-basiclite-linux.x64-21.12.0.0.0dbru.zip \
  && ln -s /opt/oracle/instantclient_* /opt/oracle/instantclient

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
ENV PATH=$LD_LIBRARY_PATH:$PATH

# Dependencias Node
COPY package.json .
RUN npm install

# Código
COPY index.js .

EXPOSE 3000

CMD ["node", "index.js"]
