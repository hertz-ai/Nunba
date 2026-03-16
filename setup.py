from setuptools import setup

setup(
    name="OmniParserGUI",
    version="1.0.0",
    description="Windows GUI application for OmniParser Computer Control",
    author="OmniParser",
    packages=[],  # This is intentionally empty as we're not creating a package
    py_modules=["app"],
    install_requires=[
        "flask>=2.0.0",
        "pywebview>=4.1.0",
        "pyautogui>=0.9.52",
        "pillow>=9.0.0",
        "flask-cors>=3.0.10",
    ],
    entry_points={
        "console_scripts": [
            "omniparser-gui=app:main",
        ],
    },
)