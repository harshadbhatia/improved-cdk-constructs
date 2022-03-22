.ONESHELL:

ACCOUNT_ID=$(shell aws sts get-caller-identity --query Account --output text)
ACCOUNT_NAME:=$(shell aws iam list-account-aliases --query AccountAliases --output text)

ACCOUNT_REGION=ap-southeast-2
NODE_ENV=dev

CONFIG_DIR=config/${ACCOUNT_NAME}

export ACCOUNT_NAME
export ACCOUNT_ID
export ACCOUNT_REGION
export NODE_ENV
export CDK_DEFAULT_ACCOUNT=$(ACCOUNT_ID)
export CDK_DEFAULT_REGION=$(ACCOUNT_REGION)

cdk-deploy:
	@echo "--- Deployment"
	docker run -e NODE_ENV=$(NODE_ENV) \
	-e CDK_DEFAULT_ACCOUNT=$(ACCOUNT_ID) -e CDK_DEFAULT_REGION=$(ACCOUNT_REGION) \
	-t cdk cdk deploy -v --all --require-approval never

cdk-synth-%:
	CDK_DEFAULT_ACCOUNT=$(ACCOUNT_ID); CDK_DEFAULT_REGION=$(ACCOUNT_REGION); \
	cdk synth -v $*

cdk-deploy-%:
	CDK_DEFAULT_ACCOUNT=$(ACCOUNT_ID); CDK_DEFAULT_REGION=$(ACCOUNT_REGION); \
	cdk deploy -v $* --require-approval never

set-git-config:
	git config --global user.email "harshadbhatia2012@gmail.com"
	git config --global user.name "Harshad Bhatia"

release: set-git-config
	npm run clean && npm run build && npm run release && \
	git push --follow-tags origin master && npm publish

install-husky:
	npx husky install
	npx husky add .husky/commit-msg "npx commitlint --edit $1"

git-force-push:
	rm -rf .git
	git init
	git add .
	git commit -m "feat: initial commit"
	git remote add origin https://github.com/harshadbhatia/improved-cdk-constructs.git
	git push origin master --force
