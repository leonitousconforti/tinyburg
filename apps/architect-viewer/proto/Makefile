PROTOC=./protoc-22.0-linux-x86_64
PROTBUF_INCLUDE=.
PROTCOL_BUFFERS=emulator_controller.proto

JS_OUT="import_style=commonjs,binary:./generated"
GRPC_WEB_OUT="import_style=typescript,mode=grpcweb:./generated"
PROTOC_GEN_JS_PLUGIN="protoc-gen-js=./protoc-gen-js-3.21.2-linux-x86_64"
PROTOC_GRPC_WEB_PLUGIN="protoc-gen-grpc-web=protoc-gen-grpc-web-1.4.2-linux-x86_64"

.PHONY: types
types:
	$(PROTOC) -I=$(PROTBUF_INCLUDE) $(PROTCOL_BUFFERS) --js_out=$(JS_OUT) --grpc-web_out=$(GRPC_WEB_OUT) --plugin=$(PROTOC_GEN_JS_PLUGIN) --plugin=$(PROTOC_GRPC_WEB_PLUGIN)

.PHONY: clean
clean:
	rm -f ./generated/*
