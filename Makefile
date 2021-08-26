PACKAGE=perfsonar-psconfig-web-admin-auth
ROOTPATH=/usr/lib/perfsonar/psconfig-web-admin/auth
CONFIGPATH=/etc/perfsonar/psconfig-web
#LIBPATH=/usr/lib/perfsonar/lib
#GRAPHLIBPATH=/usr/lib/perfsonar/psconfig-web/lib
PERFSONAR_AUTO_VERSION=4.4.2
PERFSONAR_AUTO_RELNUM=0.a1.0
VERSION=${PERFSONAR_AUTO_VERSION}
RELEASE=${PERFSONAR_AUTO_RELNUM}

default:
	@echo No need to build the package. Just run \"make install\"

dist:
	make manifest
	mkdir /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	tar ch -T MANIFEST -T MANIFEST-node_modules -T MANIFEST-ui-node_modules | tar x -C /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	tar czf $(PACKAGE)-$(VERSION).$(RELEASE).tar.gz -C /tmp $(PACKAGE)-$(VERSION).$(RELEASE)
	rm -rf /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	cp $(PACKAGE)-$(VERSION).$(RELEASE).tar.gz ~/rpmbuild/SOURCES/

manifest:
	find node_modules -type f > MANIFEST-node_modules
	# add UI node modules, ignoring a few large folders. optimize this later
	find ui/node_modules -type f | grep -v bootswatch/docs | grep -v ace-builds > MANIFEST-ui-node_modules

npm:
	#cd ui; npm install --production
	npm install --only=prod && \
	pushd ui && npm install --only=prod && popd

webpack:
	./ui/node_modules/webpack/bin/webpack.js ui/js/app.js -o ui/dist/pwa-admin-ui-bundle.js

install:
	mkdir -p ${ROOTPATH}
	tar ch --exclude=etc/* --exclude=*spec --exclude=dependencies --exclude=MANIFEST --exclude=MANIFEST-node_modules --exclude=MANIFEST-ui-node_modules --exclude=LICENSE --exclude=Makefile -T MANIFEST -T MANIFEST-node_modules -T MANIFEST-ui-node_modules | tar x -C ${ROOTPATH}
	for i in `cat MANIFEST | grep ^etc/ | sed "s/^etc\///"`; do  mkdir -p `dirname $(CONFIGPATH)/$${i}`; if [ -e $(CONFIGPATH)/$${i} ]; then install -m 640 -c etc/$${i} $(CONFIGPATH)/$${i}.new; else install -m 640 -c etc/$${i} $(CONFIGPATH)/$${i}; fi; done
	#sed -i 's:.RealBin/\.\./lib:${LIBPATH}:g' ${ROOTPATH}/cgi-bin/*
	#sed -i 's:.RealBin/lib:${GRAPHLIBPATH}:g' ${ROOTPATH}/cgi-bin/*

rpm:
	make auth

auth:
	rpmbuild -bs perfsonar-psconfig-web-admin-auth.spec
	rpmbuild -ba perfsonar-psconfig-web-admin-auth.spec

clean_all: clean npm_clean

clean:
	rm -f perfsonar-psconfig*.tar.gz
	rm -rf ~/rpmbuild/RPMS/x86_64/perfsonar-psconfig-web-admin-auth*.rpm ~/rpmbuild/BUILD/perfsonar-psconfig-web-admin-auth* ~/rpmbuild/BUILDROOT/perfsonar-psconfig-web-admin-auth* ~/rpmbuild/SOURCES/perfsonar-psconfig-web-admin-auth* ~/rpmbuild/SRPMS/perfsonar-psconfig-web-admin-auth* ~/rpmbuild/SPECS/perfsonar-psconfig-web-admin-auth/*

npm_clean:
	rm -f MANIFEST-node_modules
	rm -f MANIFEST-ui-node_modules
	rm -rf node_modules
	rm -rf ui/node_modules

# These tests will have to be done differently, since this project uses nodejs instead of perl

#test:
#	    PERL_DL_NONLAZY=1 /usr/bin/perl "-MExtUtils::Command::MM" "-e" "test_harness(0)" t/*.t

#cover:
#	    cover -test

#test_jenkins:
#	    mkdir -p tap_output
#		    PERL5OPT=-MDevel::Cover prove t/ --archive tap_output/
