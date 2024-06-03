import { useState, useRef, useEffect } from "react";
import { mp4 } from "mux.js";


const VideoPlayer = () => {
    const [segments, setSegments] = useState([]);
    const flag = useRef(false);

    let mime = 'video/mp4; codecs="mp4a.40.2,avc1.64001f"';

    let mediaSource = useRef(new MediaSource());

    let transmuxer = useRef(new mp4.Transmuxer());

    let sourceBuffer = useRef(null);

    const video = useRef(null);

    let streamURL = "http://192.168.100.1:9981/stream/channelid/1716352676?ticket=BBE208F603618773F2A9529E4C22E84A77D7ECB1&profile=pass";

    useEffect(() => {
        fetch(streamURL).then((response) => response.body)
        .then((rb) => {
            const reader = rb.getReader();

            return new ReadableStream({
                start(controller) {

                    // The following function handles each data chunk
                    function push() {
                        // done is a `boolean` and value is `Uint8Array`
                        reader.read().then(({done, value}) => {
                            // if the stream is done
                            if (done) {
                                console.log("done: ", done);
                                controller.close();
                                return;
                            }
                            // Get the data and send it to the browser via the controller
                            controller.enqueue(value);
                            setSegments((v) => {
                                v = [...v, value]
                                return v;
                            });
                            // Check chunks
                            // console.log(done, value);
                            push();
                        });
                    }
                    push();
                },
            });
        }).then((stream) => {
            console.log(stream);
            new Response(stream, { headers: { "Content-Type": "text/html" }}).text();
        }).then((result) => console.log(result));
        video.current.src = URL.createObjectURL(mediaSource.current);
    },
    []);

    useEffect(() => {
        console.log("segment's length: ", segments.length);
        if (segments.length != 0 && !flag.current) {
            flag.current = true;
            mediaSource.current.addEventListener("sourceopen", appendFirstSegment);
        }
    }, 
    [segments]
    );

    const appendFirstSegment = () => {
        console.log("gholam 1");
        if (segments.length == 0) {
            console.log("empty!!!");
            return;
        }

        URL.revokeObjectURL(video.src);
        sourceBuffer.current = mediaSource.current.addSourceBuffer(mime);
        sourceBuffer.current.addEventListener("updateend", appendNextSegment);

        transmuxer.current.on("data", (segment) => {
            console.log("gholam 2");
            let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
            data.set(segment.initSegment, 0);
            data.set(segment.data, segment.initSegment.byteLength);
            console.log(mp4.tools.inspect(data));
            transmuxer.current.off("data");
        })
        console.log("gholam 2");

        transmuxer.current.push(segments[0]);
        setSegments((v) => {
            v.shift();
            return v;
        })
        transmuxer.current.push();
        transmuxer.current.flush();
    }

    const appendNextSegment = () => {
        transmuxer.current.on("data", (segment) => {
            sourceBuffer.current.appendBuffer(new Uint8Array(segment.data));
            transmuxer.current.off("data");
        })

        if (segments.length == 0) {
            mediaSource.endofStream();
        }

        segments.forEach((segment) => {
            transmuxer.current.push(segment);
            transmuxer.current.flush();
        })
    }


    return (
        <>
            <video 
                ref={video}
                controls
                width={"80%"}
            >
            </video>
        </>
    )
}

export default VideoPlayer;
