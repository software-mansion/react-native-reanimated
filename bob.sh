export CWD=`pwd`
yarn prepare && \
cd $CWD/Example && \
yarn tsc --noEmit

cd $CWD
