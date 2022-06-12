FROM python:3.9

# Install Python requirements
COPY requirements.txt /tmp/

RUN pip install --upgrade pip
RUN pip install -r /tmp/requirements.txt

# Make sure python output is printed directly to stdout
ENV PYTHONUNBUFFERED=1
