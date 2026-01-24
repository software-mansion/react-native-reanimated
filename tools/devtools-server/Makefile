# Reanimated DevTools Server Makefile
# Requires: GLFW, OpenGL, and Dear ImGui

CXX = clang++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -DGL_SILENCE_DEPRECATION

# ImGui source directory (will be downloaded if not present)
IMGUI_DIR = imgui

# Platform-specific settings
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    # macOS
    LIBS = -framework OpenGL -framework Cocoa -framework IOKit -framework CoreVideo
    LIBS += $(shell pkg-config --libs glfw3 2>/dev/null || echo "-lglfw")
    CXXFLAGS += $(shell pkg-config --cflags glfw3 2>/dev/null)
else
    # Linux
    LIBS = -lGL -lglfw -ldl -lpthread
endif

TARGET = devtools-server
INCLUDES = -I$(IMGUI_DIR) -I$(IMGUI_DIR)/backends

SRCS = main.cpp \
       $(IMGUI_DIR)/imgui.cpp \
       $(IMGUI_DIR)/imgui_draw.cpp \
       $(IMGUI_DIR)/imgui_tables.cpp \
       $(IMGUI_DIR)/imgui_widgets.cpp \
       $(IMGUI_DIR)/backends/imgui_impl_glfw.cpp \
       $(IMGUI_DIR)/backends/imgui_impl_opengl3.cpp

OBJS = main.o imgui.o imgui_draw.o imgui_tables.o imgui_widgets.o imgui_impl_glfw.o imgui_impl_opengl3.o

# Get absolute path for compile_commands.json
WORKDIR := $(shell pwd)

all: check-deps $(IMGUI_DIR) compile_commands.json $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LIBS)

main.o: main.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

imgui.o: $(IMGUI_DIR)/imgui.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

imgui_draw.o: $(IMGUI_DIR)/imgui_draw.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

imgui_tables.o: $(IMGUI_DIR)/imgui_tables.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

imgui_widgets.o: $(IMGUI_DIR)/imgui_widgets.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

imgui_impl_glfw.o: $(IMGUI_DIR)/backends/imgui_impl_glfw.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

imgui_impl_opengl3.o: $(IMGUI_DIR)/backends/imgui_impl_opengl3.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c -o $@ $<

$(IMGUI_DIR):
	@echo "Downloading Dear ImGui..."
	@git clone --depth 1 --branch v1.90.1 https://github.com/ocornut/imgui.git $(IMGUI_DIR)

check-deps:
	@which pkg-config > /dev/null || (echo "Warning: pkg-config not found" && true)
ifeq ($(UNAME_S),Darwin)
	@which brew > /dev/null && brew list glfw > /dev/null 2>&1 || \
		(echo "Please install GLFW: brew install glfw" && exit 1)
else
	@pkg-config --exists glfw3 || (echo "Please install GLFW: apt install libglfw3-dev" && exit 1)
endif

compile_commands.json: $(IMGUI_DIR)
	@echo "Generating compile_commands.json for LSP..."
	@echo '[' > compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c main.cpp -o main.o",' >> compile_commands.json
	@echo '    "file": "main.cpp"' >> compile_commands.json
	@echo '  },' >> compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c $(IMGUI_DIR)/imgui.cpp -o imgui.o",' >> compile_commands.json
	@echo '    "file": "$(IMGUI_DIR)/imgui.cpp"' >> compile_commands.json
	@echo '  },' >> compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c $(IMGUI_DIR)/imgui_draw.cpp -o imgui_draw.o",' >> compile_commands.json
	@echo '    "file": "$(IMGUI_DIR)/imgui_draw.cpp"' >> compile_commands.json
	@echo '  },' >> compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c $(IMGUI_DIR)/imgui_tables.cpp -o imgui_tables.o",' >> compile_commands.json
	@echo '    "file": "$(IMGUI_DIR)/imgui_tables.cpp"' >> compile_commands.json
	@echo '  },' >> compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c $(IMGUI_DIR)/imgui_widgets.cpp -o imgui_widgets.o",' >> compile_commands.json
	@echo '    "file": "$(IMGUI_DIR)/imgui_widgets.cpp"' >> compile_commands.json
	@echo '  },' >> compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c $(IMGUI_DIR)/backends/imgui_impl_glfw.cpp -o imgui_impl_glfw.o",' >> compile_commands.json
	@echo '    "file": "$(IMGUI_DIR)/backends/imgui_impl_glfw.cpp"' >> compile_commands.json
	@echo '  },' >> compile_commands.json
	@echo '  {' >> compile_commands.json
	@echo '    "directory": "$(WORKDIR)",' >> compile_commands.json
	@echo '    "command": "$(CXX) $(CXXFLAGS) $(INCLUDES) -c $(IMGUI_DIR)/backends/imgui_impl_opengl3.cpp -o imgui_impl_opengl3.o",' >> compile_commands.json
	@echo '    "file": "$(IMGUI_DIR)/backends/imgui_impl_opengl3.cpp"' >> compile_commands.json
	@echo '  }' >> compile_commands.json
	@echo ']' >> compile_commands.json
	@echo "Done! compile_commands.json generated."

clean:
	rm -f $(TARGET) $(OBJS)

clean-all: clean
	rm -rf $(IMGUI_DIR) compile_commands.json .clangd .vscode

.PHONY: all clean clean-all check-deps compile_commands.json
