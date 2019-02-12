echo $PATH

pkgin -y full-upgrade

pkgin -y in nginx nodejs yarn

mkdir -p /var/www/img

tee /opt/local/etc/nginx/nginx.conf <<EOF
user www  www;
worker_processes 1;

events {
  worker_connections  1024;
}

http {
  include /opt/local/etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout  65;
  gzip on;
  server {
    listen 80;
    server_name localhost;

    location / {
      root   share/examples/nginx/html;
      index  index.html index.htm;
    }

    #error_page  404              /404.html;

    # redirect server error pages to the static page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   share/examples/nginx/html;
    }

    # proxy the PHP scripts to Apache listening on 127.0.0.1:80
    #
    #location ~ \.php$ {
    #    proxy_pass   http://127.0.0.1;
    #}

    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    #
    #location ~ \.php$ {
    #    root           html;
    #    fastcgi_pass   127.0.0.1:9000;
    #    fastcgi_index  index.php;
    #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
    #    include        /opt/local/etc/nginx/fastcgi_params;
    #}

    # deny access to .htaccess files, if Apache's document root
    # concurs with nginx's one
    #
    #location ~ /\.ht {
    #    deny  all;
    #}
  }
}
EOF

svcadm enable -rs svc:/pkgsrc/nginx:default