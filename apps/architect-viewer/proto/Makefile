.PHONY: types
types:
	npx protoc -I . --ts_out ./../src/generated --ts_opt optimize_code_size emulator_controller.proto

.PHONY: clean
clean:
	rm -rf ./../src/generated/*
