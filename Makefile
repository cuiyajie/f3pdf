build-f3:
	npx gulp minified-f3

deploy:
	aws s3 sync build/minified-f3/ s3://b3d-open1/site/pdfviewer-f3-$(shell date +%y%m%d%H%M)/ --acl public-read

serve:
	npx gulp server

dev-build:
	npx gulp minified-f3; cd build/minified-f3/; http-server --port 8888

update:
	git pull --rebase
	npx gulp minified-f3
	aws s3 sync build/minified-f3/ s3://b3d-open1/site/pdfviewer-f3-$(shell date +%y%m%d%H%M)/ --acl public-read
