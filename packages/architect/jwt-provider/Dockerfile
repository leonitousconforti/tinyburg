FROM python:latest
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
EXPOSE 8008
ENTRYPOINT ["python"]
CMD ["jwt-provider.py"]
